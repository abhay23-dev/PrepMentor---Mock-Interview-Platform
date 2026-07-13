import mongoose, { Schema } from "mongoose";
import { IUser } from "../types";

const userSchema = new Schema<IUser>(
{
  name:{
    type:String,
    trim:true
  },

  email:{
    type:String,
    unique:true,
    lowercase:true,
    trim:true
  },

  password:{
    type:String
  },

  totalInterviews:{
    type:Number,
    default:0
  },

  averageScore:{
    type:Number,
    default:0
  }

},
{
  timestamps:true
}
);

const User = mongoose.model<IUser>(
  "User",
  userSchema
);
export default User;