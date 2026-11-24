import mongoose, { Document, Types } from "mongoose";
export interface IGDSession extends Document {
    userId: Types.ObjectId;
    userName: string;
    topic: string;
    numParticipants: number;
    status: "ONGOING" | "COMPLETED";
    timerDuration: number;
    startTime: Date;
    endTime?: Date;
    aiTurnsSinceUser: number;
    totalAiTurns: number;
}
declare const GDSession: mongoose.Model<IGDSession, {}, {}, {}, mongoose.Document<unknown, {}, IGDSession, {}, {}> & IGDSession & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default GDSession;
