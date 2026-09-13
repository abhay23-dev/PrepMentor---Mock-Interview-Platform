import { NextFunction, Request, Response } from "express";
import { asyncHandler, sendSuccess } from "../utils/responseHelpers.js";
import Interview from "../models/Interview.js";
import { AppError } from "../middleware/errorHandler.js";
import Answer from "../models/Answer.js";
 
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
export const getInterviewFeedback = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const interviewId = req.params.interviewId;
 
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      throw new AppError("Interview not found", 404);
    }
    if (interview.userId.toString() !== userId) {
      throw new AppError("Unauthorized", 403);
    }
 
    // Sorted by createdAt so questions appear in the order they were
    // actually asked, not in whatever order Mongo happens to return them.
    const answers = await Answer.find({ interviewId })
      .populate("questionId")
      .sort({ createdAt: 1 });
 
    if (answers.length === 0) {
      throw new AppError("No answers found for this interview", 400);
    }
 
    const questions = answers.map((answer: any, index: number) => ({
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
 
    return sendSuccess(
      res,
      feedbackResponse,
      "Feedback retrieved successfully",
    );
  },
);