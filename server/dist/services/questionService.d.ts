import { IQuestion } from "../types/index.js";
/**
 * Returns a question for the given topic/difficulty that hasn't already
 * been asked in this interview (excludeIds).
 *
 * Strategy:
 * - If this topic/difficulty bucket already has >= TARGET_POOL_SIZE_PER_BUCKET
 *   stored questions, always reuse one from the DB (random, unused-in-this-
 *   interview) instead of calling the AI.
 * - While the bucket is still small, mostly generate a new AI question (to
 *   grow the pool towards the target), but sometimes reuse an existing one
 *   anyway to save tokens.
 * - If AI generation fails for any reason, fall back to whatever is in the
 *   DB rather than breaking the interview.
 */
export declare const getNextQuestion: (topic: string, difficulty: string, excludeIds: string[]) => Promise<IQuestion>;
