import mongoose,{ Schema } from "mongoose";
import { IInterview } from "../types";

const interviewSchema =
new Schema<IInterview>(
{
  userId:{
    type:Schema.Types.ObjectId,
    ref:"User",
    required:true
  },
  topic:{
    type:String,
    required:true
  },
  difficulty:{
    type:String,
    enum:[
      "Easy",
      "Medium",
      "Hard"
    ],
    required:true
  },
  currentDifficulty:{
    type:String,
    enum:[
      "Easy",
      "Medium",
      "Hard"
    ],
    default:"Medium"
  },
  askedQuestions:[
 {
   type:Schema.Types.ObjectId,
   ref:"Question"
 }
],
  status:{
    type:String,
    enum:[
      "ONGOING",
      "COMPLETED"
    ],
    default:"ONGOING"
  },

  questionsAsked:{
    type:Number,
    default:0
  },

  maxQuestions:{
    type:Number,
    default:5
  },

  overallScore:{
    type:Number,
    default:0
  },

  startTime:{
    type:Date,
    default:Date.now
  },

  endTime:{
    type:Date
  }

},
{
  timestamps:true
}
);

const Interview =
mongoose.model<IInterview>(
"Interview",
interviewSchema
);

export default Interview;