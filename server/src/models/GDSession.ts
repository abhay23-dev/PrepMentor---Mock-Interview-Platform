import mongoose, { Document, Schema, Types } from "mongoose";

export interface IGDSession extends Document {
  userId: Types.ObjectId;
  userName: string;
  topic: string;
  numParticipants: number;
  status: "ONGOING" | "COMPLETED";
  timerDuration: number; // seconds
  startTime: Date;
  endTime?: Date;
  // Counters kept on the session so the orchestrator never has to scan the
  // whole transcript to decide who speaks next (cheaper + lower latency).
  aiTurnsSinceUser: number;
  totalAiTurns: number;
}

const gdSessionSchema = new Schema<IGDSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: {
      type: String,
      default: "Participant",
    },
    topic: {
      type: String,
      required: true,
    },
    numParticipants: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["ONGOING", "COMPLETED"],
      default: "ONGOING",
    },
    timerDuration: {
      type: Number,
      required: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    aiTurnsSinceUser: {
      type: Number,
      default: 0,
    },
    totalAiTurns: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const GDSession = mongoose.model<IGDSession>("GDSession", gdSessionSchema);

export default GDSession;
