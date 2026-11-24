import { NextFunction, Request, Response } from "express";
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
export declare const getInterviewFeedback: (req: Request, res: Response, next: NextFunction) => void;
