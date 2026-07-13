import { Document, Types } from "mongoose";

export enum Topics {
  DBMS = 'dbms',
  OS = "os", 
  CN = "cn",
  OOPS = "oops",
  REACT = "react",
  NODE = "node",
  OTHER = "other"
}

export enum Difficulty {
  EASY = "Easy",
  HARD = "Hard",
  MEDIUM = "Medium"
}

export interface IUser extends Document {

  name: string;
  email: string;
  password: string;
  totalInterviews: number;
  averageScore: number;
}
export interface IInterview extends Document {

  userId: Types.ObjectId;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  currentDifficulty:
    "Easy"
    | "Medium"
    | "Hard";
  status:
    "ONGOING"
    | "COMPLETED";
  questionsAsked: number;
  askedQuestions: Types.ObjectId[];
  maxQuestions: number;
  overallScore: number;
  startTime: Date;
  endTime?: Date;
}

export interface IQuestion extends Document {

  topic: string;
  difficulty: string;
  questionText: string;
  keywords: string[];
  questionType: string;
}

export interface IAnswer extends Document {

  interviewId: Types.ObjectId;
  questionId: Types.ObjectId;
  transcript: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  aiFeedback: string;
}

export interface IFeedback extends Document {

  interviewId: Types.ObjectId;
  overallScore: number;
  communicationScore: number;
  technicalScore: number;
  confidenceScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvementAreas: string[];
}