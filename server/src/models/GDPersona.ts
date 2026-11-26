import mongoose, { Document, Schema, Types } from "mongoose";

export interface IGDPersona extends Document {
  sessionId: Types.ObjectId;
  name: string;
  personalityTrait: string;
  stance: string;
  voiceIndex: number;
  assertiveness: number; // 0..1: how likely to interrupt / hold the floor
}

const gdPersonaSchema = new Schema<IGDPersona>({
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: "GDSession",
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  personalityTrait: {
    type: String,
    default: "",
  },
  stance: {
    type: String,
    default: "",
  },
  voiceIndex: {
    type: Number,
    default: 0,
  },
  assertiveness: {
    type: Number,
    default: 0.5,
  },
});

const GDPersona = mongoose.model<IGDPersona>("GDPersona", gdPersonaSchema);

export default GDPersona;
