import mongoose from "mongoose";
import { IAnswer } from "../types";
declare const Answer: mongoose.Model<IAnswer, {}, {}, {}, mongoose.Document<unknown, {}, IAnswer, {}, {}> & IAnswer & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Answer;
