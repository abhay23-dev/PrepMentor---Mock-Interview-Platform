import Question from "../models/Question.js";
import { generateInterviewQuestion } from "./aiService.js";
import { IQuestion } from "../types/index.js";

// Once a (topic, difficulty) bucket has at least this many stored questions,
// we stop generating new ones by default and just reuse the pool. With 3
// difficulties per topic, this lands each topic around 3 x 15 = 45 total
// questions — inside the 40-50 target.
const TARGET_POOL_SIZE_PER_BUCKET = 15;

// Even while a bucket is still being built up, occasionally reuse an
// existing question instead of calling the AI, to cut down on token usage
// rather than generating a brand new question every single time.
const REUSE_PROBABILITY_WHILE_GROWING = 0.3;

// How many of the topic's existing questions to show the AI so it avoids
// generating something near-identical to what's already stored.
const DEDUPE_CONTEXT_SIZE = 30;

const TOPIC_LABELS: Record<string, string> = {
  dbms: "Database Management Systems",
  os: "Operating Systems",
  cn: "Computer Networks",
  oops: "Object-Oriented Programming",
  react: "React",
  node: "Node.js",
  other: "General Software Engineering",
};

const getTopicLabel = (topic: string) => TOPIC_LABELS[topic] ?? topic;

// Loose normalization so trivial differences (casing, punctuation, extra
// whitespace) don't let a near-identical AI-generated question slip in as
// "new".
const normalize = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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
export const getNextQuestion = async (
  topic: string,
  difficulty: string,
  excludeIds: string[],
): Promise<IQuestion> => {
  const totalInBucket = await Question.countDocuments({ topic, difficulty });

  const unused = await Question.find({
    topic,
    difficulty,
    _id: { $nin: excludeIds },
  });

  const bucketIsFull = totalInBucket >= TARGET_POOL_SIZE_PER_BUCKET;
  const shouldReuseWhileGrowing =
    !bucketIsFull &&
    unused.length > 0 &&
    Math.random() < REUSE_PROBABILITY_WHILE_GROWING;

  if (unused.length > 0 && (bucketIsFull || shouldReuseWhileGrowing)) {
    const randomIndex = Math.floor(Math.random() * unused.length);
    return unused[randomIndex];
  }

  // Otherwise, generate a fresh question via AI and store it so future
  // interviews can reuse it too.
  try {
    const recentForTopic = await Question.find({ topic })
      .sort({ _id: -1 })
      .limit(DEDUPE_CONTEXT_SIZE)
      .select("questionText");

    const generated = await generateInterviewQuestion(
      getTopicLabel(topic),
      difficulty,
      recentForTopic.map((q) => q.questionText),
    );

    // Cheap de-duplication safety net: if something near-identical already
    // exists, reuse that instead of inserting a near-duplicate.
    const normalizedNew = normalize(generated.questionText);
    const duplicate = recentForTopic.find(
      (q) => normalize(q.questionText) === normalizedNew,
    );
    if (duplicate) {
      const existing = await Question.findById(duplicate._id);
      if (existing) return existing;
    }

    const saved = await new Question({
      topic,
      difficulty,
      questionText: generated.questionText,
      keywords: generated.keywords,
      questionType: "TECHNICAL",
    }).save();

    return saved;
  } catch (error) {
    console.error(
      `AI question generation failed for ${topic}/${difficulty}, falling back to DB:`,
      error,
    );

    // Last resort: reuse ANY question for this topic/difficulty, even one
    // already asked in this interview, rather than failing the interview.
    const fallbackPool =
      unused.length > 0
        ? unused
        : await Question.find({ topic, difficulty });

    if (fallbackPool.length === 0) {
      throw error;
    }

    const randomIndex = Math.floor(Math.random() * fallbackPool.length);
    return fallbackPool[randomIndex];
  }
};