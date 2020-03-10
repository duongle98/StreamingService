import { ChunksCollection } from "./chunks_collection.js";
import MONGODB_CREDENTIALS from "../../credentials/mongodb.js";
import { FilesCollection, FileMetadata } from "./files_collection.js";



//TEST -- Creating a chunk
(async function(){
    const CHUNKS_COLLECTION = new ChunksCollection(MONGODB_CREDENTIALS.loginURI, "hls_test"); // test db
    let r =  await CHUNKS_COLLECTION.addChunk({
        "fileType": "text/plain",
        "replicas": [],
        "aux": {
            "origin": "test_video",
            "duration": 10.0 // 10 seconds for example
        }
    }).catch(e => {
        console.log("[FAILED] TEST adding chunk 1");
        console.log(e);
    });
    console.log("Test adding chunk 1");
    console.log(r);
    await CHUNKS_COLLECTION.close();
    return;
})();



//TEST -- Adding replicas to a chunk
(async function(){
    const CHUNKS_COLLECTION = new ChunksCollection(MONGODB_CREDENTIALS.loginURI,  "hls_test"); // test db
    let r =  await CHUNKS_COLLECTION.addChunk({
        "fileType": "text/plain",
        "replicas": [],
        "aux": {
            "origin": "test_video",
            "duration": 10.0 // 10 seconds for example
        }
    }).catch(e => {
        console.log("[FAILED] Test adding replica to chunk");
        console.log(e);
    });
    r = await CHUNKS_COLLECTION.addReplicas(r._id, [0,1,2,3]).catch(e =>  {
        console.log("[FAILED] Test adding replica to chunk");
        console.log(e);
    });
    console.log(`Test adding replicas [0,1,2,3] to chunk ${r._id}`);
    console.log(r);
    await CHUNKS_COLLECTION.close();
    return;
})();


//TEST -- Adding file
(async function(){
    const CHUNKS_COLLECTION = new ChunksCollection(MONGODB_CREDENTIALS.loginURI, "hls_test"); // test db
    const FILES_COLLECTION = new FilesCollection(MONGODB_CREDENTIALS.loginURI, "hls_test"); // test db

    //first create a chunk
    let r =  await CHUNKS_COLLECTION.addChunk({
        "fileType": "text/plain",
        "replicas": [],
        "aux": {
            "origin": "test_video",
            "duration": 10.0 // 10 seconds for example
        }
    }).catch(e => {
        console.log("[FAILED] TEST -- Adding file with 1 chunk");
        console.log(e);
    });
    
    r =  await FILES_COLLECTION.addFile({
        fileType: "octa-stream",
        chunks: [r._id],
        aux: {
            "movie_name": "hello_world"
        }
    }).catch(e => {
        console.log("[FAILED] TEST -- Adding file with 1 chunk");
        console.log(e);
    });

    console.log(r);
    await FILES_COLLECTION.close();
    await CHUNKS_COLLECTION.close();
    return;
})();