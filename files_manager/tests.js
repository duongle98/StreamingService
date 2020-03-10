import { AccountManager } from "../google/accounts.js";
import { generateAccounts } from "../google/utils/helper.js";
import { ChunksCollection  } from "./database/chunks_collection.js";
import { FilesCollection} from "./database/files_collection.js";
import { FileUploader } from "./uploader.js";
import fs from 'fs';
import GoogleCredentialsConfig from "../configs/googlecredentials.js";
import MONGODB_CREDENTIALS from "../credentials/mongodb.js";


(async function (){
    let uploaderManager = new AccountManager();
    let accounts = await generateAccounts(GoogleCredentialsConfig.service_accounts);
    accounts.forEach(account => {
        uploaderManager.addAccount(account, false);
    });
    let fileUploader = new FileUploader(MONGODB_CREDENTIALS.loginURI, "hls_test");
    fileUploader.loadAccountManager(uploaderManager);
    let file = await fileUploader.uploadFile(fs.createReadStream("./test_upload.mp4"), {fileType:"mp4", chunkSize: 630125 * 10});
    console.log("Test uploading chunkified file")
    console.log(file);
    await fileUploader.close().catch(e => console.log(e));
})();

(async function (){
    let uploaderManager = new AccountManager();
    let accounts = await generateAccounts(GoogleCredentialsConfig.service_accounts);
    accounts.forEach(account => {
        uploaderManager.addAccount(account, false);
    });
    let fileUploader = new FileUploader(MONGODB_CREDENTIALS.loginURI, "hls_test");
    fileUploader.loadAccountManager(uploaderManager);
    let file = await fileUploader.uploadFile(fs.createReadStream("./test_upload.mp4"), {fileType:"mp4", chunkSize: 0});
    await fileUploader.close().catch(e => console.log(e));
})();