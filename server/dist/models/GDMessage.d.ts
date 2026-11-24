import mongoose, { Document, Types } from "mongoose";
export interface IGDMessage extends Document {
    sessionId: Types.ObjectId;
    speaker: string;
    speakerName: string;
    text: string;
    timestamp: Date;
}
declare const GDMessage: mongoose.Model<IGDMessage, {}, {}, {}, mongoose.Document<unknown, {}, IGDMessage, {}, {}> & IGDMessage & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default GDMessage;
