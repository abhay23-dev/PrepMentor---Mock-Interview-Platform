import mongoose, { Document, Schema, Types } from "mongoose";

export interface IGDMessage extends Document {
  sessionId: Types.ObjectId;
  speaker: string; // personaId, or "user"
  speakerName: string;
  text: string;
  timestamp: Date;
}

const gdMessageSchema = new Schema<IGDMessage>({
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: "GDSession",
    required: true,
  },
  speaker: {
    type: String,
    required: true,
  },
  speakerName: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Every turn reads "the last N messages of this session", so this index
// keeps that query fast no matter how long the discussion gets.
gdMessageSchema.index({ sessionId: 1, timestamp: -1 });

const GDMessage = mongoose.model<IGDMessage>("GDMessage", gdMessageSchema);

export default GDMessage;
