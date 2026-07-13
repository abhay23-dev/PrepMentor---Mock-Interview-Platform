import mongoose,{ Schema } from "mongoose";
import { IQuestion } from "../types";

const questionSchema =
new Schema<IQuestion>(
{
  topic:String,
  difficulty:String,
  questionText:String,
  keywords:[String],
  questionType: {
    type:String,
    enum:[
      "TECHNICAL",
      "HR",
      "BEHAVIORAL"
    ],
  },
}
);

const Question =
mongoose.model<IQuestion>(
"Question",
questionSchema
);

export default Question;