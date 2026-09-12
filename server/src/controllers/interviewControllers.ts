import { NextFunction, Request, Response } from "express";
import { asyncHandler, sendSuccess } from "../utils/responseHelpers.js";
import { AppError } from "../middleware/errorHandler.js";
import { Difficulty, InterviewResponse, Topics } from "../types/index.js";
import Question from "../models/Question.js";
import Interview from "../models/Interview.js";
import Answer from "../models/Answer.js";
import { evaluateAnswer, generateOverallSummary } from "../services/aiService.js";
import { getNextQuestion } from "../services/questionService.js";
import { getNextDifficulty } from "../utils/difficultyHelper.js";

export const startInterview = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;

    const { topic, difficulty } = req.body;

    if (!topic) {
      throw new AppError("Topic is required", 400);
    }
    if (!difficulty) {
      throw new AppError("Difficulty is required", 400);
    }

    const validTopics = Object.values(Topics);
    if (!validTopics.includes(topic)) {
      throw new AppError(
        `Invalid Topic. Must be one of ${validTopics.join(", ")}`,
        400,
      );
    }

    const validDifficulty = Object.values(Difficulty);
    if (!validDifficulty.includes(difficulty)) {
      throw new AppError(
        `Invalid Difficulty. Must be one of ${validDifficulty.join(", ")}`,
        400,
      );
    }

    let firstQuestion;
    try {
      firstQuestion = await getNextQuestion(topic, difficulty, []);
    } catch (error) {
      console.error("Failed to get a question for new interview:", error);
      const detail =
        process.env.NODE_ENV === "development" && error instanceof Error
          ? ` (${error.message})`
          : "";
      throw new AppError(
        `Unable to prepare interview questions right now. Please try again in a moment.${detail}`,
        503,
      );
    }

    const interview = await Interview.create({
      userId,
      topic,
      difficulty,
      currentDifficulty: difficulty,
      askedQuestions: [firstQuestion._id],
    });

    const interviewResponse: InterviewResponse = {
      interviewId: interview._id,
      topic,
      difficulty,
      maxQuestions: interview.maxQuestions,
      question: {
        questionId: firstQuestion._id,
        questionText: firstQuestion.questionText,
      },
    };

    sendSuccess(res, interviewResponse, "Interview Started", 201);
  },
);

export const submitAnswer = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const interviewId = req.params.id;
    const { questionId, answer } = req.body;

    if (!questionId) {
      throw new AppError("QuestionId is required", 400);
    }
    if (!answer) {
      throw new AppError("Answer is required", 400);
    }

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      throw new AppError("Interview doesn't exist", 400);
    }

    if (interview.userId.toString() != userId) {
      throw new AppError("Unauthorized", 403);
    }

    const question = await Question.findById(questionId);
    if (!question) {
      throw new AppError("Invalid question.", 400);
    }

    if (!interview.askedQuestions.some((id) => id.toString() === questionId)) {
      throw new AppError("Question not part of Interview", 400);
    }

    // Real AI evaluation, with a safe neutral fallback if the API call fails
    // (a transient AI-provider outage shouldn't break the whole interview).
    let evaluation;
    try {
      evaluation = await evaluateAnswer(
        question.questionText,
        question.keywords ?? [],
        answer,
      );
    } catch (error) {
      console.error("AI evaluation failed, using fallback score:", error);
      evaluation = {
        score: 5,
        strengths: [] as string[],
        weaknesses: [] as string[],
        suggestions: [] as string[],
        feedback: "Automated evaluation was unavailable for this answer.",
      };
    }

    await Answer.create({
      interviewId,
      questionId,
      transcript: answer,
      score: evaluation.score,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      suggestions: evaluation.suggestions,
      aiFeedback: evaluation.feedback,
    });

    // Adaptive difficulty: adjust before picking the next question
    interview.currentDifficulty = getNextDifficulty(
      interview.currentDifficulty,
      evaluation.score,
    );

    interview.questionsAsked += 1;

    // NOTE: status is intentionally left "ONGOING" here even when the max
    // question count is reached. Finalizing status/overallScore is the
    // job of endInterview alone — see the comment there for why.
    if (interview.questionsAsked >= interview.maxQuestions) {
      await interview.save();

      return sendSuccess(res, {
        score: evaluation.score,
        feedback: evaluation.feedback,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        suggestions: evaluation.suggestions,
        completed: true,
      }, "Interview Completed");
    }

    let nextQuestion;
    try {
      nextQuestion = await getNextQuestion(
        interview.topic,
        interview.currentDifficulty,
        interview.askedQuestions.map((id) => id.toString()),
      );
    } catch (error) {
      console.error("Failed to get next question:", error);
      const detail =
        process.env.NODE_ENV === "development" && error instanceof Error
          ? ` (${error.message})`
          : "";
      throw new AppError(
        `Unable to prepare the next question right now. Please try again in a moment.${detail}`,
        503,
      );
    }

    interview.askedQuestions.push(nextQuestion._id);
    await interview.save();

    return sendSuccess(res, {
      score: evaluation.score,
      feedback: evaluation.feedback,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      suggestions: evaluation.suggestions,
      completed: false,
      nextQuestion: {
        questionId: nextQuestion._id,
        questionText: nextQuestion.questionText,
      },
    }, "Answer submitted successfully");
  },
);

export const getInterviewHistory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const interviews = await Interview.find({ userId }).sort({ createdAt: -1 });
    if (interviews.length === 0) {
      return sendSuccess(res, [], "No interivews found.");
    }

    const history = interviews.map((interview) => ({
      interviewId: interview.id,
      topic: interview.topic,
      difficulty: interview.difficulty,
      questionsAnswered: interview.questionsAsked,
      status: interview.status,
      score: interview.overallScore,
      date: interview.startTime,
    }));

    return sendSuccess(
      res,
      history,
      "Interview Details retrieved successfully",
      201,
    );
  },
);

export const getInterviewById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const interviewId = req.params.id;
    const interview = await Interview.findById(interviewId);

    if (!interview) {
      throw new AppError("No interview found", 400);
    }
    if (interview.userId.toString() !== userId) {
      throw new AppError("Unauthorized", 403);
    }
    return sendSuccess(res, interview, "Interview retrieved successfully.");
  },
);

export const endInterview = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const interviewId = req.params.id;

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      throw new AppError("Interview not found", 404);
    }
    if (interview.userId.toString() !== userId) {
      throw new AppError("Unauthorized", 403);
    }

    // This check now works correctly: status only becomes "COMPLETED" once
    // THIS function runs, not when submitAnswer merely reaches maxQuestions.
    // (Previously submitAnswer set status to COMPLETED itself, which meant
    // this guard always threw and endInterview could never actually run.)
    if (interview.status === "COMPLETED") {
      throw new AppError("Interview already completed", 400);
    }

    const answers = await Answer.find({ interviewId }).populate("questionId");

    const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);
    const overallScore =
      answers.length > 0
        ? Math.round((totalScore / answers.length) * 10) / 10
        : 0;

    let overallSummary = "";
    try {
      overallSummary = await generateOverallSummary(
        interview.topic,
        answers.map((a: any) => ({
          questionText: a.questionId?.questionText ?? "Question",
          transcript: a.transcript,
          score: a.score,
        })),
      );
    } catch (error) {
      console.error("Failed to generate overall summary:", error);
      overallSummary = "Summary unavailable at this time.";
    }

    interview.overallScore = overallScore;
    interview.overallSummary = overallSummary;
    interview.status = "COMPLETED";
    interview.endTime = new Date();

    await interview.save();

    const interviewSummary = {
      interviewId: interview._id,
      overallScore,
      overallSummary,
      questionsAnswered: answers.length,
      completed: true,
    };
    return sendSuccess(
      res,
      interviewSummary,
      "Interview completed Successfully",
    );
  },
);