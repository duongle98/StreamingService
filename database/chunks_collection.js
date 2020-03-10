import {Schema, createConnection} from "mongoose";
import {ObjectID} from 'mongodb';


export const ChunkSchema = new Schema({
    fileType: String,
    replicas: Array,
    aux: Schema.Types.Mixed
});

export class ChunksCollection {
    constructor(loginURI, db="hls") {
        this.client = createConnection(loginURI, {dbName: db, useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
        this.model = this.client.model("chunks", ChunkSchema);
    }

    async close() {
        await this.client.close();
    }

    async addChunk(metadata) {
        let doc = await this.model.create({...metadata});
        return doc;
    }

    async getChunk(chunkId) {
        if(typeof(chunkId) != ObjectID)
            chunkId = ObjectID(chunkId);
    
        let doc = await this.model.findOne({"_id": chunkId}).exec();
        
        if(!doc)
            throw "Mongodb returns null! chunkId is probably invalid";

        return doc;
    }

    async addReplicas(chunkId, replicas) {
        if(typeof(chunkId) != ObjectID)
            chunkId = ObjectID(chunkId);


        let res = await this.model.findOneAndUpdate({
            "_id": chunkId
        }, {
            "$addToSet": {
                "replicas": {
                     "$each": replicas
                }
            }
        }, {
            new: true
        }).exec(); 

        if(!res)
            throw "Mongodb returns null! chunkId is probably invalid";
        
        return res;
    }
}