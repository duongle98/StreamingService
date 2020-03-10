import fs from "fs";
import Bluebird from "bluebird";

import { ChunksCollection, } from "../database/chunks_collection.js"
import { FilesCollection, FileMetadata} from "../database/files_collection.js"
import { ChunkifyReadStream } from "./utils/chunkify.js";
import Media from "../utils/media.js";
import {parseOptions} from "../utils/helper.js";




const chunkifyUpload_OPTIONS_TEMPLATE = {
    "fileType": "",
    "chunkSize": 0
}

const uploadChunkifiedFile_OPTIONS_TEMPLATE = {
    "fileType": "",
}

var SINGLETONS = {

}

export class FileUploader {
    constructor(loginURI, db="hls") {
        if(SINGLETONS[loginURI+"_"+db])
            return SINGLETONS[loginURI+"_"+db];

        this.loginURI = loginURI;
        this.db = db;

        this.filesCollection = new FilesCollection(loginURI, db);
        this.chunksCollection = new ChunksCollection(loginURI, db);
        this.accountManager = null;
        SINGLETONS[loginURI+"_"+db] = this;
        return this;
    }

    async assertAccountManager() {
        if(!this.accountManager)
            throw "Please loadAccountManager(uploadManager)";

        if(!Object.keys(this.accountManager.accounts).length) 
            throw "Current accountManager has no accounts!";
    }

    async loadAccountManager(accountManager) {
        this.accountManager = accountManager;
    }

    async close() {
        delete SINGLETONS[this.loginURI+"_"+this.db];
        await this.filesCollection.close();
        await this.chunksCollection.close();
    }

    async uploadChunkifiedFile(chunkStreams, options) {
        await this.assertAccountManager();

        options = parseOptions(options, uploadChunkifiedFile_OPTIONS_TEMPLATE);
        if(!chunkStreams.length)
            return null;

        let chunkIds = new Array(chunkStreams.length);

        try {
            await Bluebird.mapSeries(chunkStreams, async (chunkStream, index) => {
                let chunk = await this.uploadChunk(chunkStream, {fileType: options.fileType});
                // better error handling here
                if(!chunk) 
                    throw "error";

                chunkIds[index] = chunk._id;
            })
        } catch(e) {
            console.log(e);
            return null;
        }

        return await this._generateFileInstance({...options, chunks: chunkIds});;
    }

    async uploadFile(fileReadStream, options) {
        await this.assertAccountManager();

        options = parseOptions(options, chunkifyUpload_OPTIONS_TEMPLATE);

        if(options.chunkSize == 0) // single-chunk file
            return await this.uploadChunkifiedFile([fileReadStream], {...options, fileType: options.fileType});

        let chunkify = new ChunkifyReadStream(options.chunkSize);
        fileReadStream.pipe(chunkify);
        let chunkStream;
        let chunkStreams = [];
        while(chunkStream = await chunkify.getNextChunkStream())
            chunkStreams.push(chunkStream)

        return await this.uploadChunkifiedFile(chunkStreams, {...options, fileType: `chunkified-${options.fileType}`});
    }


    async _generateFileInstance(obj) {
        let r =  await this.filesCollection.addFile(obj).catch(e => console.log(e));
        return r;
    }

    async uploadChunk(chunkStream, options) {
        await this.assertAccountManager();
        
        let media = new Media("application/octet-stream", chunkStream);
        let selectedAccount =  this.accountManager.getMostAvailableStorageAccount();
        if(!selectedAccount) {
            console.log("No available accounts!")
            return null;
        }

        let googleFileId = await selectedAccount.uploadFile(media).catch(e => console.log(e));

        if(!googleFileId)
            return null;

        // TODO: add better error handling here
        if(!(await selectedAccount.updateFilePermission(googleFileId).catch(e => console.log(e)))) { 
            console.log("Failed to set file permission to public")
            return null;
        }
        let chunk = await this.chunksCollection.addChunk({...options, fileType: options.fileType, replicas: [googleFileId]}).catch(e => console.log(e));

        return chunk;
    }
}