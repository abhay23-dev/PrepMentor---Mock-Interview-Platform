import dotenv from 'dotenv';
import mongoose from "mongoose";

const connectDB = async () => {
  
  try{
    const mongoDBUri = process.env.MONGODBURI;
    const connection = await mongoose.connect(mongoDBUri!);
    console.log("====================================");
    console.log("MongoDB Connected Successfully");
    console.log(`Database: ${connection.connection.name}`);
    console.log(`Host: ${connection.connection.host}`);
    console.log("=====================================");
  } catch(error){
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

export default connectDB;