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
  difficulty: Difficulty;
  currentDifficulty: Difficulty;
  status:
    "ONGOING"
    | "COMPLETED";
  questionsAsked: number;
  askedQuestions: Types.ObjectId[];
  maxQuestions: number;
  overallScore: number;
  overallSummary: string;
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

export interface InterviewResponse {
  interviewId: Types.ObjectId,
  topic: string,
  difficulty: string,
  maxQuestions: number,
  question: {
    questionId: Types.ObjectId,
    questionText: string,
  },
}

export interface AuthResponse {
  user: Omit<IUser, "password">;
  token?: string;
}