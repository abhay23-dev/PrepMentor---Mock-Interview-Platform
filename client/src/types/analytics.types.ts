import type { Difficulty, InterviewStatus, Topic } from "./interview.types";

export interface AnalyticsOverview {
  totalInterviews: number;
  totalCompleted: number;
  totalQuestionsAnswered: number;
  averageScore: number;
}

export interface ScoreTrendPoint {
  interviewId: string;
  date: string;
  topic: Topic;
  score: number;
}

export interface TopicBreakdownItem {
  topic: Topic;
  interviews: number;
  averageScore: number;
}

export interface DifficultyBreakdownItem {
  difficulty: Difficulty;
  interviews: number;
  averageScore: number;
}

export interface TalliedItem {
  text: string;
  count: number;
}

export interface RecentAnalyticsInterview {
  interviewId: string;
  topic: Topic;
  difficulty: Difficulty;
  status: InterviewStatus;
  score: number;
  date: string;
}

export interface AnalyticsResponse {
  overview: AnalyticsOverview;
  scoreTrend: ScoreTrendPoint[];
  topicBreakdown: TopicBreakdownItem[];
  difficultyBreakdown: DifficultyBreakdownItem[];
  topStrengths: TalliedItem[];
  topWeaknesses: TalliedItem[];
  topSuggestions: TalliedItem[];
  recentInterviews: RecentAnalyticsInterview[];
}
