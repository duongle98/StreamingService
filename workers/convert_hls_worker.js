import  throng from 'throng';
import  Queue  from "bull";
import { MongoClient } from 'mongodb';
import fs from 'fs';

import {ChunksCollection} from "../database/chunks_collection.js";
import { AccountManager } from "../google/accounts.js";
import {FilesCollection, HLSFileMetadata} from "../database/files_collection.js";
import { generateAccounts } from "../google/utils/helper.js";
import {FileUploader} from "../files_manager/uploader.js";
import {ConvertHLSJob} from "./job.js";
import HLSConverter from "../media_utils/hlsconverter.js";
import MONGODB_CREDENTIALS from "../credentials/mongodb.js";
import GoogleCredentialsConfig from "../configs/googlecredentials.js";



// Connect to a local redis intance locally, and the Heroku-provided URL in production
let REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Spin up multiple processes to handle jobs to take advantage of more CPU cores
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
let workers = process.env.WEB_CONCURRENCY || 2;


// The maxium number of jobs each worker should process at once. This will need
// to be tuned for your application. If each job is mostly waiting on network 
// responses it can be much higher. If each job is CPU-intensive, it might need
// to be much lower.
let maxJobsPerWorker = 3;

var filesToCleanUp = [];

async function convertAndUpload(src, fileType, fileUploader, inputOptions, outputOptions) {
    let converter = new HLSConverter(src, inputOptions, outputOptions);
    let error = [];
    const filesCollection = fileUploader.filesCollection;
    const chunksCollection = fileUploader.chunksCollection;
    let chunkInfo;
    let routines = [];
    let chunkPaths = []
    let i = 0;
    while(chunkInfo = await converter.getNextProcessedChunk().catch(e => {console.log(e); error.push(e);})) {
        console.log(chunkInfo);
        routines.push(fileUploader.uploadChunk(fs.createReadStream(chunkInfo.chunkPath), {
            fileType: "hls-chunk",
            aux: {
                extinf: chunkInfo.extinf 
            }
        }).catch(e => {console.log(e); error.push(e);})); 
        chunkPaths.push(chunkInfo.chunkPath);
    }
    let chunks = await Promise.all(routines).catch(e => {console.log(e); error.push(e);});
    filesToCleanUp.push(...chunkPaths);
    if(!error)
        throw error;

    let file = await filesCollection.addFile(new HLSFileMetadata({chunks: chunks.map(chunk => chunk._id), aux: {"m3u8Header": converter.m3u8Header}})).catch(e => {console.log(e); error.push(e);});
    if(!error)
        throw error;

    console.log("Converted File: "+JSON.stringify(file));
    
    return file;
}

async function cleanupRoutine(){
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    while(true) {
        filesToCleanUp.forEach(f => {
            fs.unlink(f, (err) => {
                if(err) console.log(err);
                console.log("Cleaned up file: "+f);
            })
        });
        filesToCleanUp = [];
        await sleep(1000);
    }
}

async function processJob(job, fileUploader) {
    const filesCollection = fileUploader.filesCollection;
    const chunksCollection = fileUploader.chunksCollection;

    let file = await filesCollection.getFile(job.fileId, {populate: "chunks"}).catch(e => console.log(e));
    console.log(file);
    if(!file) {
        console.log("File not found");
        return;
    }

    if(file.chunks.length != 1)
        return;

    let chunk = file.chunks[0];

    if(chunk.replicas.length == 0)
        return;

    // just grab the first item for now, because usually these files shouldn't have replicas
    let googleFileId = chunk.replicas[0];
    console.log(`File to process: https://www.googleapis.com/drive/v3/files/${googleFileId}?alt=media&key=AIzaSyBj-qabVIiLub5CrxIYSNUF4HoRIJGxWBE`);
    let hlsFile = await convertAndUpload(`https://www.googleapis.com/drive/v3/files/${googleFileId}?alt=media&key=AIzaSyBj-qabVIiLub5CrxIYSNUF4HoRIJGxWBE`, 
                                          file.fileType, fileUploader, job.inputOptions, job.outputOptions).catch(e => console.log(e));
    if(!hlsFile)
       return; 

    let updateFile = await filesCollection.updateConvertedFile(file._id, hlsFile._id).catch(e => console.log(e));

    if(!updateFile)
       return; 

    console.log("Updating original file: "+JSON.stringify(updateFile));
}

function start() {
    cleanupRoutine().catch(e => console.log(e));
    // generate Accounts from config
    generateAccounts(GoogleCredentialsConfig.service_accounts).then( accounts => {
        // create AccountManager for all google service accounts we have
        let accountManager = new AccountManager();
        accounts.forEach(acc => {
            accountManager.addAccount(acc); // add each acc to AccountManager
        });
        MongoClient.connect(MONGODB_CREDENTIALS.loginURI, {useUnifiedTopology: true, useNewUrlParser: true}).catch(err => console.log(err)).then(client => {
            // Connect to the named work queue
            let workQueue = new Queue('hls_converter', REDIS_URL);
            workQueue.process(maxJobsPerWorker, async (jobPayload) => {
                let job = new ConvertHLSJob(jobPayload.data);
                console.log(job);
                let error = null;
                let fileUploader = new FileUploader(MONGODB_CREDENTIALS.loginURI, job.db);
                fileUploader.loadAccountManager(accountManager); //load accounts
                processJob(job, fileUploader).catch(e => console.log(e));
                return {status: 1, message: "Job received!"}
            });
        }).catch(e => console.log(e));
    }).catch(e => console.log(e));

}

// Initialize the clustered worker process
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
throng({
    workers,
    start
});