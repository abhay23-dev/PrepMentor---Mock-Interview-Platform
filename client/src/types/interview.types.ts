// These mirror your backend's Topics/Difficulty enums (types/index.ts)
// and the shapes returned by interviewControllers.ts

export type Topic =
  | "dbms"
  | "os"
  | "cn"
  | "oops"
  | "react"
  | "node"
  | "other";

export type Difficulty = "Easy" | "Medium" | "Hard";

export type InterviewStatus = "IDLE" | "ONGOING" | "COMPLETED";

export interface InterviewQuestion {
  questionId: string;
  questionText: string;
}

// ---- Request payloads ----

export interface StartInterviewRequest {
  topic: Topic;
  difficulty: Difficulty;
}

export interface SubmitAnswerRequest {
  questionId: string;
  answer: string;
}

// ---- Response payloads (the `data` field of sendSuccess) ----

export interface StartInterviewResponse {
  interviewId: string;
  topic: Topic;
  difficulty: Difficulty;
  maxQuestions: number;
  question: InterviewQuestion;
}

export interface SubmitAnswerResponse {
  score: number;
  completed: boolean;
  // only present when completed === false
  nextQuestion?: InterviewQuestion;
}

export interface EndInterviewResponse {
  interviewId: string;
  overallScore: number;
  questionsAnswered: number;
  completed: boolean;
}

export interface InterviewHistoryItem {
  interviewId: string;
  topic: Topic;
  difficulty: Difficulty;
  questionsAnswered: number;
  status: InterviewStatus;
  score: number;
  date: string;
}

// ---- Zustand store shape ----

export interface InterviewStore {
  interviewId: string | null;
  topic: Topic | null;
  difficulty: Difficulty | null;
  maxQuestions: number;
  questionsAsked: number;
  currentQuestion: InterviewQuestion | null;
  status: InterviewStatus;
  lastScore: number | null;
  overallScore: number | null;
  isLoading: boolean;
  error: string | null;

  startInterview: (topic: Topic, difficulty: Difficulty) => Promise<string>;
  submitAnswer: (answer: string) => Promise<{ completed: boolean }>;
  endInterview: () => Promise<void>;
  reset: () => void;
}
