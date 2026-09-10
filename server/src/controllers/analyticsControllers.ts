import { NextFunction, Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { asyncHandler, sendSuccess } from "../utils/responseHelpers.js";
import Interview from "../models/Interview.js";
import Answer from "../models/Answer.js";

/**
 * All analytics here are scoped to the authenticated user (req.userId).
 * The controllers themselves stay thin — each one just calls a "compute*"
 * helper and sends the result. The helpers are exported so multiple pieces
 * of analytics can be composed together (see getDashboardAnalytics) without
 * duplicating aggregation logic or firing the same query twice.
 */

// ---------- Shared types ----------

interface TopicBreakdown {
  topic: string;
  interviewsCount: number;
  averageScore: number;
  bestScore: number;
}

interface DifficultyBreakdown {
  difficulty: string;
  questionsCount: number;
  averageScore: number;
}

interface ProgressPoint {
  interviewId: Types.ObjectId;
  topic: string;
  difficulty: string;
  score: number;
  date: Date;
}

interface StrengthsWeaknesses {
  topStrengths: { text: string; count: number }[];
  topWeaknesses: { text: string; count: number }[];
  topSuggestions: { text: string; count: number }[];
}

interface OverviewAnalytics {
  totalInterviews: number;
  completedInterviews: number;
  ongoingInterviews: number;
  totalQuestionsAnswered: number;
  topicsPracticed: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  averageDurationMinutes: number;
  trend: {
    recentAverage: number;
    previousAverage: number;
    changePercent: number;
  };
}

// ---------- Helpers ----------

const toObjectId = (userId: string) => new Types.ObjectId(userId);

/**
 * Returns every interview id that belongs to this user. Used to scope
 * Answer-collection aggregations (Answers don't store userId directly).
 */
const getUserInterviewIds = async (userId: string): Promise<Types.ObjectId[]> => {
  const ids = await Interview.find({ userId }).distinct("_id");
  return ids as unknown as Types.ObjectId[];
};

export const computeOverview = async (
  userId: string,
): Promise<OverviewAnalytics> => {
  const objectId = toObjectId(userId);

  const [totalInterviews, completedInterviews, interviewIds] =
    await Promise.all([
      Interview.countDocuments({ userId: objectId }),
      Interview.countDocuments({ userId: objectId, status: "COMPLETED" }),
      getUserInterviewIds(userId),
    ]);

  const [totalQuestionsAnswered, topics] = await Promise.all([
    Answer.countDocuments({ interviewId: { $in: interviewIds } }),
    Interview.distinct("topic", { userId: objectId }),
  ]);

  const scoreStatsAgg = await Interview.aggregate([
    { $match: { userId: objectId, status: "COMPLETED" } },
    {
      $group: {
        _id: null,
        averageScore: { $avg: "$overallScore" },
        bestScore: { $max: "$overallScore" },
        worstScore: { $min: "$overallScore" },
        averageDurationMinutes: {
          $avg: {
            $cond: [
              { $and: ["$endTime", "$startTime"] },
              {
                $divide: [
                  { $subtract: ["$endTime", "$startTime"] },
                  1000 * 60,
                ],
              },
              null,
            ],
          },
        },
      },
    },
  ]);

  const stats = scoreStatsAgg[0] ?? {
    averageScore: 0,
    bestScore: 0,
    worstScore: 0,
    averageDurationMinutes: 0,
  };

  // Trend: compare the average of the last 5 completed interviews against
  // the 5 before that, so the UI can show "improving" / "declining".
  const recentCompleted = await Interview.find({
    userId: objectId,
    status: "COMPLETED",
  })
    .sort({ endTime: -1 })
    .limit(10)
    .select("overallScore")
    .lean();

  const recentFive = recentCompleted.slice(0, 5);
  const previousFive = recentCompleted.slice(5, 10);

  const average = (arr: { overallScore: number }[]) =>
    arr.length > 0
      ? arr.reduce((sum, i) => sum + i.overallScore, 0) / arr.length
      : 0;

  const recentAverage = Math.round(average(recentFive) * 10) / 10;
  const previousAverage = Math.round(average(previousFive) * 10) / 10;
  const changePercent =
    previousAverage > 0
      ? Math.round(
          ((recentAverage - previousAverage) / previousAverage) * 1000,
        ) / 10
      : 0;

  return {
    totalInterviews,
    completedInterviews,
    ongoingInterviews: totalInterviews - completedInterviews,
    totalQuestionsAnswered,
    topicsPracticed: topics.length,
    averageScore: Math.round((stats.averageScore ?? 0) * 10) / 10,
    bestScore: Math.round((stats.bestScore ?? 0) * 10) / 10,
    worstScore: Math.round((stats.worstScore ?? 0) * 10) / 10,
    averageDurationMinutes:
      Math.round((stats.averageDurationMinutes ?? 0) * 10) / 10,
    trend: {
      recentAverage,
      previousAverage,
      changePercent,
    },
  };
};

export const computeTopicBreakdown = async (
  userId: string,
): Promise<TopicBreakdown[]> => {
  const objectId = toObjectId(userId);

  const result = await Interview.aggregate([
    { $match: { userId: objectId, status: "COMPLETED" } },
    {
      $group: {
        _id: "$topic",
        interviewsCount: { $sum: 1 },
        averageScore: { $avg: "$overallScore" },
        bestScore: { $max: "$overallScore" },
      },
    },
    { $sort: { averageScore: -1 } },
  ]);

  return result.map((r) => ({
    topic: r._id,
    interviewsCount: r.interviewsCount,
    averageScore: Math.round(r.averageScore * 10) / 10,
    bestScore: Math.round(r.bestScore * 10) / 10,
  }));
};

export const computeDifficultyBreakdown = async (
  userId: string,
): Promise<DifficultyBreakdown[]> => {
  const interviewIds = await getUserInterviewIds(userId);

  if (interviewIds.length === 0) {
    return [];
  }

  const result = await Answer.aggregate([
    { $match: { interviewId: { $in: interviewIds } } },
    {
      $lookup: {
        from: "questions",
        localField: "questionId",
        foreignField: "_id",
        as: "question",
      },
    },
    { $unwind: "$question" },
    {
      $group: {
        _id: "$question.difficulty",
        questionsCount: { $sum: 1 },
        averageScore: { $avg: "$score" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return result.map((r) => ({
    difficulty: r._id,
    questionsCount: r.questionsCount,
    averageScore: Math.round(r.averageScore * 10) / 10,
  }));
};

export const computeProgress = async (
  userId: string,
  limit: number,
): Promise<ProgressPoint[]> => {
  const objectId = toObjectId(userId);

  const interviews = await Interview.find({
    userId: objectId,
    status: "COMPLETED",
  })
    .sort({ endTime: -1 })
    .limit(limit)
    .select("topic difficulty overallScore endTime")
    .lean();

  // Return oldest -> newest so the UI can plot it left-to-right on a chart.
  return interviews
    .reverse()
    .map((interview) => ({
      interviewId: interview._id as Types.ObjectId,
      topic: interview.topic,
      difficulty: interview.difficulty,
      score: interview.overallScore,
      date: interview.endTime as Date,
    }));
};

export const computeStrengthsWeaknesses = async (
  userId: string,
  topN: number = 8,
): Promise<StrengthsWeaknesses> => {
  const interviewIds = await getUserInterviewIds(userId);

  if (interviewIds.length === 0) {
    return { topStrengths: [], topWeaknesses: [], topSuggestions: [] };
  }

  const facetPipeline = (field: string) => [
    { $unwind: `$${field}` },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 as const } },
    { $limit: topN },
  ];

  const [result] = await Answer.aggregate([
    { $match: { interviewId: { $in: interviewIds } } },
    {
      $facet: {
        strengths: facetPipeline("strengths"),
        weaknesses: facetPipeline("weaknesses"),
        suggestions: facetPipeline("suggestions"),
      },
    },
  ]);

  const mapItems = (items: { _id: string; count: number }[]) =>
    items.map((i) => ({ text: i._id, count: i.count }));

  return {
    topStrengths: mapItems(result?.strengths ?? []),
    topWeaknesses: mapItems(result?.weaknesses ?? []),
    topSuggestions: mapItems(result?.suggestions ?? []),
  };
};

// ---------- Controllers ----------

export const getOverviewAnalytics = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const overview = await computeOverview(req.userId);
    sendSuccess(res, overview, "Overview analytics retrieved successfully");
  },
);

export const getTopicAnalytics = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const topics = await computeTopicBreakdown(req.userId);
    sendSuccess(res, topics, "Topic analytics retrieved successfully");
  },
);

export const getDifficultyAnalytics = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const difficulty = await computeDifficultyBreakdown(req.userId);
    sendSuccess(
      res,
      difficulty,
      "Difficulty analytics retrieved successfully",
    );
  },
);

export const getProgressAnalytics = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const limitParam = parseInt(req.query.limit as string, 10);
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 50)
        : 10;

    const progress = await computeProgress(req.userId, limit);
    sendSuccess(res, progress, "Progress analytics retrieved successfully");
  },
);

export const getStrengthsWeaknessesAnalytics = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const data = await computeStrengthsWeaknesses(req.userId);
    sendSuccess(
      res,
      data,
      "Strengths and weaknesses analytics retrieved successfully",
    );
  },
);

/**
 * Single combined endpoint so the analytics dashboard page can render with
 * one network round trip instead of five. Runs every aggregation in
 * parallel since none of them depend on each other.
 */
export const getDashboardAnalytics = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;

    const [overview, topics, difficulty, progress, strengthsWeaknesses] =
      await Promise.all([
        computeOverview(userId),
        computeTopicBreakdown(userId),
        computeDifficultyBreakdown(userId),
        computeProgress(userId, 10),
        computeStrengthsWeaknesses(userId),
      ]);

    sendSuccess(
      res,
      {
        overview,
        topics,
        difficulty,
        progress,
        strengthsWeaknesses,
      },
      "Dashboard analytics retrieved successfully",
    );
  },
);
