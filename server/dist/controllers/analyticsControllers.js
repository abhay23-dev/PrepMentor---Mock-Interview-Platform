"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserAnalytics = void 0;
const responseHelpers_js_1 = require("../utils/responseHelpers.js");
const Interview_js_1 = __importDefault(require("../models/Interview.js"));
const Answer_js_1 = __importDefault(require("../models/Answer.js"));
const mongoose_1 = __importDefault(require("mongoose"));
// GET /api/analytics
// Aggregates everything the dashboard/analytics page needs for the
// logged-in user in a single round trip: headline stats, a score trend
// over time, a per-topic breakdown, a per-difficulty breakdown, and the
// most recent strengths/weaknesses/suggestions pulled from answers.
exports.getUserAnalytics = (0, responseHelpers_js_1.asyncHandler)(async (req, res) => {
    const userId = new mongoose_1.default.Types.ObjectId(req.userId);
    const interviews = await Interview_js_1.default.find({ userId }).sort({
        startTime: 1,
    });
    const completedInterviews = interviews.filter((i) => i.status === "COMPLETED");
    const totalInterviews = interviews.length;
    const totalCompleted = completedInterviews.length;
    const totalQuestionsAnswered = interviews.reduce((sum, i) => sum + (i.questionsAsked || 0), 0);
    const averageScore = totalCompleted > 0
        ? Math.round((completedInterviews.reduce((sum, i) => sum + (i.overallScore || 0), 0) /
            totalCompleted) *
            10) / 10
        : 0;
    // Score trend: one point per completed interview, in chronological order.
    const scoreTrend = completedInterviews.map((i) => ({
        interviewId: i.id,
        date: i.endTime ?? i.startTime,
        topic: i.topic,
        score: i.overallScore,
    }));
    // Per-topic breakdown (count + average score, based on completed ones).
    const topicMap = new Map();
    for (const i of completedInterviews) {
        const entry = topicMap.get(i.topic) ?? { count: 0, totalScore: 0 };
        entry.count += 1;
        entry.totalScore += i.overallScore || 0;
        topicMap.set(i.topic, entry);
    }
    const topicBreakdown = Array.from(topicMap.entries()).map(([topic, { count, totalScore }]) => ({
        topic,
        interviews: count,
        averageScore: Math.round((totalScore / count) * 10) / 10,
    }));
    // Per-difficulty breakdown.
    const difficultyMap = new Map();
    for (const i of completedInterviews) {
        const entry = difficultyMap.get(i.difficulty) ?? {
            count: 0,
            totalScore: 0,
        };
        entry.count += 1;
        entry.totalScore += i.overallScore || 0;
        difficultyMap.set(i.difficulty, entry);
    }
    const difficultyBreakdown = Array.from(difficultyMap.entries()).map(([difficulty, { count, totalScore }]) => ({
        difficulty,
        interviews: count,
        averageScore: Math.round((totalScore / count) * 10) / 10,
    }));
    // Strength / weakness signal pulled from the most recent answers across
    // all of this user's interviews (cheap to compute, useful on its own).
    const interviewIds = interviews.map((i) => i._id);
    const recentAnswers = await Answer_js_1.default.find({
        interviewId: { $in: interviewIds },
    })
        .sort({ createdAt: -1 })
        .limit(50);
    const tally = (field) => {
        const counts = new Map();
        for (const answer of recentAnswers) {
            for (const item of answer[field] ?? []) {
                counts.set(item, (counts.get(item) ?? 0) + 1);
            }
        }
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([text, count]) => ({ text, count }));
    };
    const topStrengths = tally("strengths");
    const topWeaknesses = tally("weaknesses");
    const topSuggestions = tally("suggestions");
    const recentInterviews = interviews
        .slice(-5)
        .reverse()
        .map((i) => ({
        interviewId: i.id,
        topic: i.topic,
        difficulty: i.difficulty,
        status: i.status,
        score: i.overallScore,
        date: i.startTime,
    }));
    return (0, responseHelpers_js_1.sendSuccess)(res, {
        overview: {
            totalInterviews,
            totalCompleted,
            totalQuestionsAnswered,
            averageScore,
        },
        scoreTrend,
        topicBreakdown,
        difficultyBreakdown,
        topStrengths,
        topWeaknesses,
        topSuggestions,
        recentInterviews,
    }, "Analytics retrieved successfully");
});
//# sourceMappingURL=analyticsControllers.js.map