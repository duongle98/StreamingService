import {Schema, createConnection} from "mongoose";
import {ChunkSchema} from "./chunks_collection.js"
import {ObjectID} from 'mongodb';


const FileSchema = new Schema({
    fileType: {type: String, required: true},
    chunks: [{type: Schema.Types.ObjectId, ref: "chunks"}],
    status: Number,
    aux: Schema.Types.Mixed,
    convertedFile: {type: Schema.Types.ObjectId, ref: "files", required: false},
});

export class FileMetadata {
    constructor(obj){
        let indexes = FileSchema.paths;
        this._payload = {}
        for(const key of Object.keys(indexes)){
            // { fileType: SchemaString { ... }, status: SchemaNumber { ... } }
            if(key in obj){
                this._payload[key] = obj[key];
            }
        }
    }

    payload() {
        return this._payload;
    }
}


export class HLSFileMetadata extends FileMetadata {
    constructor(obj){
        super(obj);
        this._payload["fileType"] = "hls";
    }

    payload() {
        return this._payload;
    }

}


export class FilesCollection {
    constructor(loginURI, db="hls") {
        this.client = createConnection(loginURI, {dbName: db, useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
        this.model = this.client.model("files", FileSchema);
        this.client.model("chunks", ChunkSchema);

    }

    async addFile(metadata) {
        if(metadata instanceof FileMetadata)
            metadata = metadata.payload();

        let doc = await this.model.create({...metadata});
        return doc;
    }

    async close() {
        await this.client.close();
    }


    async updateFile(fileId, updateQuery) {
        if(!(fileId instanceof ObjectID))
            fileId = ObjectID(fileId);

        let res = await this.model.findOneAndUpdate({
            "_id": fileId
        }, 
        updateQuery, {
            new: true
        }).exec();
        
        if(!res)
            throw "Mongodb returns null. fileId is probably invalid";

        return res;
    }

    async getFile(fileId, options=null) {
        if(!(fileId instanceof ObjectID))
            fileId = ObjectID(fileId);
        
    

        let res = this.model.findOne({
            "_id": fileId
        });

        if(options && options.populate)
            res = res.populate(options.populate);

        res = await res.exec();
        
        if(!res)
            throw "Mongodb returns null. fileId is probably invalid";

        return res;
    }

    async updateConvertedFile(fileId, convertedFileId) {
        if(!(fileId instanceof ObjectID))
            fileId = ObjectID(fileId);

        if(typeof(convertedFileId) != ObjectID)
            convertedFileId = ObjectID(convertedFileId);
        

        let res = await this.model.findOneAndUpdate({
            "_id": fileId
        }, {
            "$set": {
                "convertedFile": convertedFileId
            }
        }, {
            new: true
        }).exec();

        if(!res)
            throw "Mongodb returns null. fileId is probably invalid";

        return res;
    }

    async addChunks(fileId, chunks) {
        if(!(fileId instanceof ObjectID))
            fileId = ObjectID(fileId);

        chunks = chunks.map(chunk => {
            if(typeof(chunk) != ObjectID)
                return ObjectID(chunk);
            return chunk;
        })
        
        let res = await this.model.findOneAndUpdate({
            "_id": fileId
        }, {
            "$push": {
                "chunks": {
                     "$each": chunks
                }
            }
        }, {
            new : true
        }).exec(); 

        if(!res)
            throw "Mongodb returns null. fileId is probably invalid";

        return res;
    }
}