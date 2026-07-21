import { NextFunction, Request, Response } from "express";
import { asyncHandler, sendSuccess } from "../utils/responseHelpers.js";
import Interview from "../models/Interview.js";
import { AppError } from "../middleware/errorHandler.js";
import Answer from "../models/Answer.js";

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

    const answers = await Answer.find({ interviewId });

    if (answers.length === 0) {
      throw new AppError("No answers found", 400);
    }

    const totalScore = answers.reduce((sum, answer) => answer.score + sum, 0);

    const averageScore = Math.round((totalScore / answers.length) * 10) / 10;
    let summary = "";
    let strengths: string[] = [];
    let weaknesses: string[] = [];
    let suggestions: string[] = [];

    if (averageScore >= 8) {
      summary = "Strong performance";

      strengths = [
        "Good technical understanding",
        "Answered most questions confidently",
      ];

      weaknesses = ["Minor improvements possible"];

      suggestions = ["Practice advanced topics"];
    } else if (averageScore >= 5) {
      summary = "Average performance";

      strengths = ["Basic concepts understood"];

      weaknesses = ["Some answers lacked depth"];

      suggestions = ["Revise core concepts", "Practice mock interviews"];
    } else {
      summary = "Needs improvement";

      strengths = ["Attempted all questions"];

      weaknesses = ["Weak technical understanding"];

      suggestions = ["Review fundamentals", "Practice regularly"];
    }

    const feedbackResponse = {
      interviewId,
      topic: interview.topic,
      overallScore: averageScore,
      questionsAnswered: answers.length,
      summary,
      strengths,
      weaknesses,
      suggestions,
    };
    return sendSuccess(
      res,
      feedbackResponse,
      "Feedback generated successfully",
    );
  },
);
