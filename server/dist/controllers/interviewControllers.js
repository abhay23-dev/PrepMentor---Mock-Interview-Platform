"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.endInterview = exports.getInterviewById = exports.getInterviewHistory = exports.submitAnswer = exports.startInterview = void 0;
const responseHelpers_js_1 = require("../utils/responseHelpers.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const index_js_1 = require("../types/index.js");
const Question_js_1 = __importDefault(require("../models/Question.js"));
const Interview_js_1 = __importDefault(require("../models/Interview.js"));
const Answer_js_1 = __importDefault(require("../models/Answer.js"));
const aiService_js_1 = require("../services/aiService.js");
const questionService_js_1 = require("../services/questionService.js");
const difficultyHelper_js_1 = require("../utils/difficultyHelper.js");
exports.startInterview = (0, responseHelpers_js_1.asyncHandler)(async (req, res, next) => {
    const userId = req.userId;
    const { topic, difficulty } = req.body;
    if (!topic) {
        throw new errorHandler_js_1.AppError("Topic is required", 400);
    }
    if (!difficulty) {
        throw new errorHandler_js_1.AppError("Difficulty is required", 400);
    }
    const validTopics = Object.values(index_js_1.Topics);
    if (!validTopics.includes(topic)) {
        throw new errorHandler_js_1.AppError(`Invalid Topic. Must be one of ${validTopics.join(", ")}`, 400);
    }
    const validDifficulty = Object.values(index_js_1.Difficulty);
    if (!validDifficulty.includes(difficulty)) {
        throw new errorHandler_js_1.AppError(`Invalid Difficulty. Must be one of ${validDifficulty.join(", ")}`, 400);
    }
    let firstQuestion;
    try {
        firstQuestion = await (0, questionService_js_1.getNextQuestion)(topic, difficulty, []);
    }
    catch (error) {
        console.error("Failed to get a question for new interview:", error);
        const detail = process.env.NODE_ENV === "development" && error instanceof Error
            ? ` (${error.message})`
            : "";
        throw new errorHandler_js_1.AppError(`Unable to prepare interview questions right now. Please try again in a moment.${detail}`, 503);
    }
    const interview = await Interview_js_1.default.create({
        userId,
        topic,
        difficulty,
        currentDifficulty: difficulty,
        askedQuestions: [firstQuestion._id],
    });
    const interviewResponse = {
        interviewId: interview._id,
        topic,
        difficulty,
        maxQuestions: interview.maxQuestions,
        question: {
            questionId: firstQuestion._id,
            questionText: firstQuestion.questionText,
        },
    };
    (0, responseHelpers_js_1.sendSuccess)(res, interviewResponse, "Interview Started", 201);
});
exports.submitAnswer = (0, responseHelpers_js_1.asyncHandler)(async (req, res, next) => {
    const userId = req.userId;
    const interviewId = req.params.id;
    const { questionId, answer } = req.body;
    if (!questionId) {
        throw new errorHandler_js_1.AppError("QuestionId is required", 400);
    }
    if (!answer) {
        throw new errorHandler_js_1.AppError("Answer is required", 400);
    }
    const interview = await Interview_js_1.default.findById(interviewId);
    if (!interview) {
        throw new errorHandler_js_1.AppError("Interview doesn't exist", 400);
    }
    if (interview.userId.toString() != userId) {
        throw new errorHandler_js_1.AppError("Unauthorized", 403);
    }
    const question = await Question_js_1.default.findById(questionId);
    if (!question) {
        throw new errorHandler_js_1.AppError("Invalid question.", 400);
    }
    if (!interview.askedQuestions.some((id) => id.toString() === questionId)) {
        throw new errorHandler_js_1.AppError("Question not part of Interview", 400);
    }
    // Real AI evaluation, with a safe neutral fallback if the API call fails
    // (a transient AI-provider outage shouldn't break the whole interview).
    let evaluation;
    try {
        evaluation = await (0, aiService_js_1.evaluateAnswer)(question.questionText, question.keywords ?? [], answer);
    }
    catch (error) {
        console.error("AI evaluation failed, using fallback score:", error);
        evaluation = {
            score: 5,
            strengths: [],
            weaknesses: [],
            suggestions: [],
            feedback: "Automated evaluation was unavailable for this answer.",
            idealAnswer: "",
        };
    }
    await Answer_js_1.default.create({
        interviewId,
        questionId,
        transcript: answer,
        score: evaluation.score,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        suggestions: evaluation.suggestions,
        aiFeedback: evaluation.feedback,
        idealAnswer: evaluation.idealAnswer,
    });
    // Adaptive difficulty: adjust before picking the next question
    interview.currentDifficulty = (0, difficultyHelper_js_1.getNextDifficulty)(interview.currentDifficulty, evaluation.score);
    interview.questionsAsked += 1;
    // NOTE: status is intentionally left "ONGOING" here even when the max
    // question count is reached. Finalizing status/overallScore is the
    // job of endInterview alone — see the comment there for why.
    if (interview.questionsAsked >= interview.maxQuestions) {
        await interview.save();
        return (0, responseHelpers_js_1.sendSuccess)(res, {
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
        nextQuestion = await (0, questionService_js_1.getNextQuestion)(interview.topic, interview.currentDifficulty, interview.askedQuestions.map((id) => id.toString()));
    }
    catch (error) {
        console.error("Failed to get next question:", error);
        const detail = process.env.NODE_ENV === "development" && error instanceof Error
            ? ` (${error.message})`
            : "";
        throw new errorHandler_js_1.AppError(`Unable to prepare the next question right now. Please try again in a moment.${detail}`, 503);
    }
    interview.askedQuestions.push(nextQuestion._id);
    await interview.save();
    return (0, responseHelpers_js_1.sendSuccess)(res, {
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
});
exports.getInterviewHistory = (0, responseHelpers_js_1.asyncHandler)(async (req, res, next) => {
    const userId = req.userId;
    const interviews = await Interview_js_1.default.find({ userId }).sort({ createdAt: -1 });
    if (interviews.length === 0) {
        return (0, responseHelpers_js_1.sendSuccess)(res, [], "No interivews found.");
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
    return (0, responseHelpers_js_1.sendSuccess)(res, history, "Interview Details retrieved successfully", 201);
});
exports.getInterviewById = (0, responseHelpers_js_1.asyncHandler)(async (req, res, next) => {
    const userId = req.userId;
    const interviewId = req.params.id;
    const interview = await Interview_js_1.default.findById(interviewId);
    if (!interview) {
        throw new errorHandler_js_1.AppError("No interview found", 400);
    }
    if (interview.userId.toString() !== userId) {
        throw new errorHandler_js_1.AppError("Unauthorized", 403);
    }
    return (0, responseHelpers_js_1.sendSuccess)(res, interview, "Interview retrieved successfully.");
});
exports.endInterview = (0, responseHelpers_js_1.asyncHandler)(async (req, res, next) => {
    const userId = req.userId;
    const interviewId = req.params.id;
    const interview = await Interview_js_1.default.findById(interviewId);
    if (!interview) {
        throw new errorHandler_js_1.AppError("Interview not found", 404);
    }
    if (interview.userId.toString() !== userId) {
        throw new errorHandler_js_1.AppError("Unauthorized", 403);
    }
    // This check now works correctly: status only becomes "COMPLETED" once
    // THIS function runs, not when submitAnswer merely reaches maxQuestions.
    // (Previously submitAnswer set status to COMPLETED itself, which meant
    // this guard always threw and endInterview could never actually run.)
    if (interview.status === "COMPLETED") {
        throw new errorHandler_js_1.AppError("Interview already completed", 400);
    }
    const answers = await Answer_js_1.default.find({ interviewId }).populate("questionId");
    const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);
    const overallScore = answers.length > 0
        ? Math.round((totalScore / answers.length) * 10) / 10
        : 0;
    let overallSummary = "";
    try {
        overallSummary = await (0, aiService_js_1.generateOverallSummary)(interview.topic, answers.map((a) => ({
            questionText: a.questionId?.questionText ?? "Question",
            transcript: a.transcript,
            score: a.score,
        })));
    }
    catch (error) {
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
    return (0, responseHelpers_js_1.sendSuccess)(res, interviewSummary, "Interview completed Successfully");
});
//# sourceMappingURL=interviewControllers.js.map