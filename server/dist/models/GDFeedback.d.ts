import mongoose, { Document, Types } from "mongoose";
export interface IGDFeedback extends Document {
    sessionId: Types.ObjectId;
    clarity: number;
    relevance: number;
    engagement: number;
    initiative: number;
    overallScore: number;
    summary: string;
    strengths: string[];
    improvements: string[];
}
declare const GDFeedback: mongoose.Model<IGDFeedback, {}, {}, {}, mongoose.Document<unknown, {}, IGDFeedback, {}, {}> & IGDFeedback & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default GDFeedback;
