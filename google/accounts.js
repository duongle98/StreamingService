import {google}  from 'googleapis';
import rp from "request-promise"
import fs from 'fs';
import Media from "../utils/media.js"

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class Account {
    constructor(identifier, authClient, syncRoutine=false) {
        this.identifier = identifier;
        this.authClient = authClient;
        this.drive_v3 = google.drive({version: 'v3', auth: this.authClient});
        this.metadata = {
            "limit": 0,
            "usage": 0,
            "usageInDrive": 0,
            "usageInDriveTrash": 0
        }
        this.syncRoutine = syncRoutine;
        if(syncRoutine) {
            this._syncRoutine();
        }

    }

    startRoutine() {
        if(!this.syncRoutine)
            this._syncRoutine();

        this.syncRoutine = true;
    }

    async genAPIHeaders() {
        const token = await this.authClient.authorize().catch(e => console.log(e));
        return {
            "Accept": "application/json",
            "Authorization": "Bearer "+token.access_token
        }
    }


    async uploadFile(media) {
        let uploadResp = await this.drive_v3.files.create({
            resource: {
                "name": media.name
            },
            media: media.payload(),
            fields: "id"
        }).catch(e => {
            console.log(e);
            return null;
        });

        if(!("data" in uploadResp) || !("id" in uploadResp.data))
            return null;

        return uploadResp.data.id;
    }


    async updateFilePermission(fileId, permission = {"role": "reader","type": "anyone"}) {
        return await this.drive_v3.permissions.create({
                requestBody: permission,
                fileId: fileId
        });
    }

    async updateMetadata() {
        try  {
            // for some reason, has to invoke this everytime
            let apiResp = await this.drive_v3.about.get({
                              fields: "storageQuota"
                          });
            this.metadata = apiResp.data.storageQuota
        } catch (e) {
            console.log(e)
        }
    }

    async _syncRoutine(interval=1000) {
        while(true) {
            await this.updateMetadata().catch(e => console.log(e));
            await sleep(interval)
        }
    }

    valueOf() {
        return this.metadata.limit - this.metadata.usage;
    }

    hashCode() {
        return this.identifier.hashCode();
    }

    toString() {
        return this.identifier;
    }
    
}

/* Managing multiple service accounts */
export class AccountManager {
    constructor(accounts=[]) {
        this.accounts = {}
        accounts.forEach((acc) => {
            accounts[acc.identifier] = acc;
        })
    }

    addAccount(account, startRoutine=true) {
        if(account.identifier in this.accounts)
            return account.identifier;

        this.accounts[account.identifier] = account;
        if(startRoutine)
            this.accounts[account.identifier].startRoutine();

        return account.identifier;
    } 

    async updateAccountsMetadata() {
        let routines = Object.values(this.accounts).map(acc => {
            return acc.authClient.updateMetadata().catch(e => console.log(e));
        });

        await Promise.all(routines);
    }   

    getMostAvailableStorageAccount() {
        return Object.values(this.accounts)[0];
    }
 }


