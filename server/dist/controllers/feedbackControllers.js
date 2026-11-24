"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInterviewFeedback = void 0;
const responseHelpers_js_1 = require("../utils/responseHelpers.js");
const Interview_js_1 = __importDefault(require("../models/Interview.js"));
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const Answer_js_1 = __importDefault(require("../models/Answer.js"));
/**
 * Builds the full post-interview feedback report: every question asked,
 * the candidate's own answer, and the AI's short ideal answer for it,
 * alongside the score already computed per answer.
 *
 * This intentionally does no new AI calls and no new writes — everything
 * here was already saved to the DB during the interview (Answer documents
 * carry idealAnswer/score/etc. from submitAnswer, and Interview carries
 * overallScore/overallSummary from endInterview). That means this endpoint
 * is cheap to call repeatedly, which is what lets interview history reuse
 * it any time the user wants to look back at a past interview.
 */
exports.getInterviewFeedback = (0, responseHelpers_js_1.asyncHandler)(async (req, res, next) => {
    const userId = req.userId;
    const interviewId = req.params.interviewId;
    const interview = await Interview_js_1.default.findById(interviewId);
    if (!interview) {
        throw new errorHandler_js_1.AppError("Interview not found", 404);
    }
    if (interview.userId.toString() !== userId) {
        throw new errorHandler_js_1.AppError("Unauthorized", 403);
    }
    // Sorted by createdAt so questions appear in the order they were
    // actually asked, not in whatever order Mongo happens to return them.
    const answers = await Answer_js_1.default.find({ interviewId })
        .populate("questionId")
        .sort({ createdAt: 1 });
    if (answers.length === 0) {
        throw new errorHandler_js_1.AppError("No answers found for this interview", 400);
    }
    const questions = answers.map((answer, index) => ({
        questionNumber: index + 1,
        questionText: answer.questionId?.questionText ?? "Question unavailable",
        userAnswer: answer.transcript,
        idealAnswer: answer.idealAnswer || "No ideal answer available.",
        score: answer.score,
    }));
    const feedbackResponse = {
        interviewId: interview._id,
        topic: interview.topic,
        difficulty: interview.difficulty,
        status: interview.status,
        // Computed once by endInterview and saved on the Interview document —
        // reused here rather than recalculated, so this always matches what
        // the user saw right when their interview finished.
        overallScore: interview.overallScore,
        overallSummary: interview.overallSummary,
        questionsAnswered: answers.length,
        questions,
    };
    return (0, responseHelpers_js_1.sendSuccess)(res, feedbackResponse, "Feedback retrieved successfully");
});
//# sourceMappingURL=feedbackControllers.js.map