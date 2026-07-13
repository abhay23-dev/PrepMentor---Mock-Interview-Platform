import mongoose,{ Schema } from "mongoose";
import { IAnswer } from "../types";

const answerSchema =
new Schema<IAnswer>(
{
  interviewId:{
    type:Schema.Types.ObjectId,
    ref:"Interview"
  },
  questionId:{
    type:Schema.Types.ObjectId,
    ref:"Question"
  },
  transcript:String,
  score:Number,
  strengths:[String],
  weaknesses:[String],
  suggestions:[String],
  aiFeedback:String

},
{
  timestamps:true
}
);

const Answer =
mongoose.model<IAnswer>(
"Answer",
answerSchema
);

export default Answer;