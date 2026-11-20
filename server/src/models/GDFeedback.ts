import mongoose, { Document, Schema, Types } from "mongoose";

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

const gdFeedbackSchema = new Schema<IGDFeedback>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "GDSession",
      required: true,
      unique: true, // one feedback report per session
    },
    clarity: { type: Number, default: 0 },
    relevance: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    initiative: { type: Number, default: 0 },
    overallScore: { type: Number, default: 0 },
    summary: { type: String, default: "" },
    strengths: [String],
    improvements: [String],
  },
  {
    timestamps: true,
  },
);

const GDFeedback = mongoose.model<IGDFeedback>("GDFeedback", gdFeedbackSchema);

export default GDFeedback;
