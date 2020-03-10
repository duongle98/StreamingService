import {promisify} from 'util';
import {google} from "googleapis";
import fs from 'fs';

import GoogleCredentialsConfig from "../configs/googlecredentials.js";
import {AccountManager} from "./accounts.js";
import { generateAccounts } from "./utils/helper.js";
import { Account } from "./accounts.js";
import Media from "../utils/media.js"


const readFile = promisify(fs.readFile);


(async function() {
    let accountManager = new AccountManager();
    let accounts = await generateAccounts(GoogleCredentialsConfig.service_accounts)

    accounts.forEach(account => {
        accountManager.addAccount(account, false);
    });

    let selectedAccount =  await accountManager.getMostAvailableStorageAccount();
    await selectedAccount.updateMetadata();
    console.log(selectedAccount);
    selectedAccount =  await accountManager.getMostAvailableStorageAccount();
    await selectedAccount.updateMetadata();
    console.log(selectedAccount);
})();


(async function() {
   let accountManager = new AccountManager();
    let accounts = await generateAccounts(GoogleCredentialsConfig.service_accounts)

    accounts.forEach(account => {
        accountManager.addAccount(account, false);
    });

    let selectedAccount =  await accountManager.getMostAvailableStorageAccount();
    await selectedAccount.updateMetadata();
    console.log(selectedAccount);
    selectedAccount =  await accountManager.getMostAvailableStorageAccount();
    await selectedAccount.updateMetadata();
    console.log(selectedAccount);
    await selectedAccount.updateMetadata();
    let media = new Media("text/plain", fs.createReadStream("./test_upload"));
    let fileId = await selectedAccount.uploadFile(media);
    console.log(fileId);
    await selectedAccount.updateFilePermission(fileId); // set public by default
    console.log(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=AIzaSyBj-qabVIiLub5CrxIYSNUF4HoRIJGxWBE`);
})();



// (async function() {
//     let fileContent = await readFile("./credentials/test_service_accounts.json").catch(e => {
//         console.log(e);
//         return;
//     });
//     let credentials = JSON.parse(fileContent); 
//     let authClient = new google.auth.JWT(
//         credentials.client_email, null, credentials.private_key, ['https://www.googleapis.com/auth/drive']
//     ); 

//     let account = new Account(credentials.client_email, authClient);
//     UploaderAccountManager.addAccount(account);
//     let selectedAccount =  await UploaderAccountManager.getMostAvailableStorageAccount();
//     await selectedAccount.updateMetadata();
//     console.log(selectedAccount);
// })();