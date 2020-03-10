import mongoose from "mongoose";
import Config from "../credentials/mongodb.js"

module.exports = mongoose.createConnection(Config.loginURI);