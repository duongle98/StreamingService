import Queue from 'bull';

import {ConvertHLSJob} from "./job.js";

// Connect to a local redis intance locally, and the Heroku-provided URL in production
let REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

(async function() {
    // Create / Connect to a named work queue
    let workQueue = new Queue('hls_converter', REDIS_URL);

    await workQueue.add(new ConvertHLSJob({fileId: "5e674eb65f3ddb7420b26772", db: "hls_test", inputOptions: {}, outputOptions: {}}).payload(), {attempts:3, timeout: 60000});
    await workQueue.close();
    return;
  
})();