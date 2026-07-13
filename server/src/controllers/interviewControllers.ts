import { NextFunction, Request, Response } from "express";
import { asyncHandler, sendSuccess } from "../utils/responseHelpers.js";
import { AppError } from "../middlewares/errorHandler.js";
import { Difficulty, Topics } from "../types/index.js";
import Question from "../models/Question.js";
import Interview from "../models/Interview.js";
import Answer from "../models/Answer.js";

export const startInterview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId;

  const { topic, difficulty } = req.body;

  if(!topic) {
    throw new AppError("Topic is required", 400);
  }
  if(!difficulty) {
    throw new AppError("Difficulty is required", 400);
  }
  
  const validTopics = Object.values(Topics);
  if(!validTopics.includes(topic)) {
    throw new AppError(`Invalid Topic. Must be one of ${validTopics.join(", ")}`, 400);
  }

  const validDifficulty = Object.values(Difficulty);
  if(!validDifficulty.includes(difficulty)) {
    throw new AppError(`Invalid Difficulty. Must be one of ${validDifficulty.join(", ")}`, 400);
  }

  const questions = await Question.find({
    topic,
    difficulty
  });

  if(questions.length === 0) {
    throw new AppError("No questions available.", 404);
  }

  const randomIndex = Math.floor(Math.random() * questions.length);
  const firstQuestion = questions[randomIndex];

  const interview = await Interview.create({
    userId,
    topic,
    difficulty,
    currentDifficulty: difficulty,
    askedQuestions: [
      firstQuestion._id
    ]
  });


  const interviewResponse: InterviewResponse = {
    interviewId: interview._id,
    topic,
    difficulty,
    maxQuestions: interview.maxQuestions,
    question: {
      questionId: firstQuestion._id,
      questionText: firstQuestion.questionText
    }
  }

  sendSuccess(res, interviewResponse, "Interview Started", 201);
})

export const submitAnswer = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId;
  const interviewId = req.params.id;
  const { questionId, answer } = req.body;

  if(!questionId) {
    throw new AppError("QuestionId is required", 400);
  }
  if(!answer) {
    throw new AppError("Answer is required", 400);
  }

  const interview = await Interview.findById(interviewId);
  if(!interview) {
    throw new AppError("Interview doesn't exist", 400);
  }

  if(interview.userId.toString() != userId) {
    throw new AppError("Unauthorized", 403);
  }

  const question = await Question.findById(questionId);
  if(!question) {
    throw new AppError("Invalid question.", 400);
  }

  if(!interview.askedQuestions.some(id => id.toString() === questionId)) {
    throw new AppError("Question not part of Interview", 400);
  }

  const score = Math.floor(Math.random()* 10) + 1;
  const answerDocument = await Answer.create({
    interviewId, 
    questionId,
    transcript: answer,
    score
  });

  interview.questionsAsked += 1;
  if(interview.questionsAsked >= interview.maxQuestions) {
    interview.status = "COMPLETED";
    interview.endTime = new Date();
    await interview.save();
    const answerResponse = {
      score,
      completed: true,
    }
    return sendSuccess(res, answerResponse, "Interview Completed");
  }

  const availableQuestions = await Question.find({
    topic: interview.topic,
    difficulty: interview.currentDifficulty,
    _id: {
      $nin: interview.askedQuestions
    }
  });

  if(availableQuestions.length === 0) {
    throw new AppError("No Questions are available.", 404);
  }

  const randomIndex = Math.floor(Math.random() * availableQuestions.length);
  const nextQuestion = availableQuestions[randomIndex];

  interview.askedQuestions.push(nextQuestion._id);
  await interview.save();

  const answerResponse = {
    score,
    completed: false,
    nextQuestion: {
      questionId: nextQuestion._id,
      questionText: nextQuestion.questionText,
    }
  }
  return sendSuccess(res, answerResponse, "Answer submitted successfully")
})

export const getInterviewHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId;
  const interviews = await Interview.find({userId}).sort({createdAt: -1});
  if(interviews.length === 0) {
    return sendSuccess(res, [], "No interivews found.");
  }
  

  const history = interviews.map((interview) => ({
    interviewId: interview.id,
    topic: interview.topic,
    difficulty: interview.difficulty,
    questionsAnswered: interview.questionsAsked,
    status: interview.status,
    score: interview.overallScore,
    date: interview.createdAt,
  }));

  return sendSuccess(res, history, "Interview Details retrieved successfully", 201);
})

export const getInterviewById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId;
  const interviewId = req.params.id;
  const interview = await Interview.findById(interviewId);

  if(!interview) {
    throw new AppError("No interview found", 400);
  }
  if(interview.userId.toString() !== userId) {
    throw new AppError("Unauthorized", 403);
  }
  return sendSuccess(res, interview, "Interview retrieved successfully.");
})

export const endInterview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId;
  const interviewId = req.params.id;

  const interview = await Interview.findById(interviewId);
  if(!interview) {
    throw new AppError("Interview not found", 404);
  }
  if(interview.userId.toString() !== userId) {
    throw new AppError("Unauthorized", 403);
  }

  if(interview.status === "COMPLETED") {
    throw new AppError("Interview already completed", 400);
  }
  const answers = await Answer.find({interviewId});

  const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);

  const overallScore = answers.length > 0 ? Math.round((totalScore / answers.length) * 10) / 10 : 0;

  interview.overallScore = overallScore;
  interview.status = "COMPLETED";
  interview.endTime = new Date();

  await interview.save();
  const interviewSummary = {
    interviewId: interview._id,
    overallScore,
    questionsAnswered: answers.length,
    completed: true
  };
  return sendSuccess(res, interviewSummary, "Interview completed Successfully");
})