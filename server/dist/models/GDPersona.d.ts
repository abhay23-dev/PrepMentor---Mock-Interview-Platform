import mongoose, { Document, Types } from "mongoose";
export interface IGDPersona extends Document {
    sessionId: Types.ObjectId;
    name: string;
    personalityTrait: string;
    stance: string;
    voiceIndex: number;
}
declare const GDPersona: mongoose.Model<IGDPersona, {}, {}, {}, mongoose.Document<unknown, {}, IGDPersona, {}, {}> & IGDPersona & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default GDPersona;
