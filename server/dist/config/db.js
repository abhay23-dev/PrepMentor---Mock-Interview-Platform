"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const mongoDBUri = process.env.MONGODBURI;
        const connection = await mongoose_1.default.connect(mongoDBUri, {
            serverSelectionTimeoutMS: 10000, // wait longer
        });
        console.log("====================================");
        console.log("MongoDB Connected Successfully");
        console.log(`Database: ${connection.connection.name}`);
        console.log(`Host: ${connection.connection.host}`);
        console.log("=====================================");
    }
    catch (error) {
        console.log("============================================");
        console.log("MongoDB Connection Error: ", error);
        console.log("===============================================");
        console.log("Possible fixes:");
        console.log("1. Make sure MongoDB is running");
        console.log("2. Check if port 27017 is available");
        console.log("3. Verify MONGODB_URI in .env file");
        process.exit(1);
    }
};
exports.default = connectDB;
//# sourceMappingURL=db.js.map