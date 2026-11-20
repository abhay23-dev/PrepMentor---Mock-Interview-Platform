import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { asyncHandler, sendSuccess } from "../utils/responseHelpers.js";
import { AppError } from "../middleware/errorHandler.js";
import User from "../models/User.js";
import GDSession, { IGDSession } from "../models/GDSession.js";
import GDPersona, { IGDPersona } from "../models/GDPersona.js";
import GDMessage from "../models/GDMessage.js";
import GDFeedback from "../models/GDFeedback.js";
import {
  FALLBACK_PERSONAS,
  PersonaDraft,
  GDEvaluation,
  evaluateGDPerformance,
  generatePersonaReply,
  generatePersonas,
} from "../services/gdAiService.js";
import {
  CONTEXT_MESSAGES,
  MAX_AI_TURNS_PER_SESSION,
  MessageLite,
  PersonaLite,
  WRAP_UP_SECONDS,
  pickNextSpeaker,
} from "../services/gdOrchestrator.js";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const MIN_PARTICIPANTS = 2;
const MAX_PARTICIPANTS = 5;
const MIN_TIMER_SECONDS = 60;
const MAX_TIMER_SECONDS = 900;
const MAX_USER_MESSAGE_CHARS = 1500;

const devDetail = (error: unknown) =>
  process.env.NODE_ENV === "development" && error instanceof Error
    ? ` (${error.message})`
    : "";

const remainingSecondsFor = (session: IGDSession) =>
  Math.max(
    0,
    Math.round(
      session.timerDuration - (Date.now() - session.startTime.getTime()) / 1000,
    ),
  );

const toPersonaLite = (doc: IGDPersona): PersonaLite => ({
  id: doc._id.toString(),
  name: doc.name,
  personalityTrait: doc.personalityTrait,
  stance: doc.stance,
  voiceIndex: doc.voiceIndex,
});

const getOwnedSession = async (id: string, userId: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid session id", 400);
  }
  const session = await GDSession.findById(id);
  if (!session) {
    throw new AppError("Group discussion not found", 404);
  }
  if (session.userId.toString() !== userId) {
    throw new AppError("Unauthorized", 403);
  }
  return session;
};

// Personas never change after a session starts, so cache them in memory
// instead of querying MongoDB on every single turn (saves a round trip each).
const PERSONA_CACHE_TTL_MS = 60 * 60 * 1000;
const personaCache = new Map<
  string,
  { personas: PersonaLite[]; expires: number }
>();

const cachePersonas = (sessionId: string, personas: PersonaLite[]) => {
  if (personaCache.size > 500) {
    const now = Date.now();
    for (const [key, value] of personaCache) {
      if (value.expires < now) personaCache.delete(key);
    }
  }
  personaCache.set(sessionId, {
    personas,
    expires: Date.now() + PERSONA_CACHE_TTL_MS,
  });
};

const getPersonas = async (sessionId: string): Promise<PersonaLite[]> => {
  const cached = personaCache.get(sessionId);
  if (cached && cached.expires > Date.now()) return cached.personas;

  const docs = await GDPersona.find({ sessionId }).sort({ voiceIndex: 1 });
  const personas = docs.map(toPersonaLite);
  cachePersonas(sessionId, personas);
  return personas;
};

// One in-flight turn per session. Protects against double requests (React
// StrictMode, double clicks) generating two AI lines at once.
const turnLocks = new Set<string>();
const endLocks = new Set<string>();

const sanitizeTopic = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

const finalizePersonas = (
  generated: PersonaDraft[],
  count: number,
  userName: string,
): PersonaDraft[] => {
  const used = new Set<string>([userName.toLowerCase()]);
  const result: PersonaDraft[] = [];

  for (const persona of [...generated, ...FALLBACK_PERSONAS]) {
    if (result.length >= count) break;
    const key = persona.name.toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    result.push(persona);
  }
  return result;
};

// ---------------------------------------------------------------------------
// Next-turn logic (shared by /next-turn and /message)
// ---------------------------------------------------------------------------

interface TurnState {
  aiTurnsSinceUser: number;
  totalAiTurns: number;
}

interface NextTurnResult {
  finished: boolean;
  remainingSeconds: number;
  speaker?: string; // persona id or "user"
  speakerName?: string;
  text?: string;
  messageId?: string;
  wrapUp?: boolean;
}

const buildNextTurn = async (
  session: IGDSession,
  state: TurnState,
): Promise<NextTurnResult> => {
  const remainingSeconds = remainingSecondsFor(session);

  if (
    session.status === "COMPLETED" ||
    remainingSeconds <= 0 ||
    state.totalAiTurns >= MAX_AI_TURNS_PER_SESSION
  ) {
    return { finished: true, remainingSeconds };
  }

  const sessionId = session._id.toString();

  // Independent reads, so run them in parallel.
  const [personas, recentDesc] = await Promise.all([
    getPersonas(sessionId),
    GDMessage.find({ sessionId })
      .sort({ timestamp: -1, _id: -1 })
      .limit(CONTEXT_MESSAGES)
      .select("speaker speakerName text")
      .lean(),
  ]);

  const recent: MessageLite[] = recentDesc.reverse().map((m) => ({
    speaker: m.speaker,
    speakerName: m.speakerName,
    text: m.text,
  }));

  const choice = pickNextSpeaker(personas, recent, state.aiTurnsSinceUser);

  if (choice.type === "user") {
    return {
      finished: false,
      remainingSeconds,
      speaker: "user",
      speakerName: session.userName,
    };
  }

  const { persona } = choice;
  const wrapUp = remainingSeconds <= WRAP_UP_SECONDS;

  let text: string;
  try {
    text = await generatePersonaReply({
      personaName: persona.name,
      personalityTrait: persona.personalityTrait,
      stance: persona.stance,
      topic: session.topic,
      userName: session.userName,
      recent,
      wrapUp,
    });
  } catch (error) {
    console.error("GD reply generation failed:", error);
    throw new AppError(
      `The AI participant couldn't respond. Please try again.${devDetail(error)}`,
      502,
    );
  }

  const [message] = await Promise.all([
    GDMessage.create({
      sessionId: session._id,
      speaker: persona.id,
      speakerName: persona.name,
      text,
    }),
    GDSession.updateOne(
      { _id: session._id },
      { $inc: { aiTurnsSinceUser: 1, totalAiTurns: 1 } },
    ),
  ]);

  return {
    finished: false,
    remainingSeconds,
    speaker: persona.id,
    speakerName: persona.name,
    text,
    messageId: message._id.toString(),
    wrapUp,
  };
};

// ---------------------------------------------------------------------------
// POST /api/gd/start
// ---------------------------------------------------------------------------

export const startSession = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;

    const topic = sanitizeTopic(req.body.topic);
    const numParticipants = Number(req.body.numParticipants ?? 3);
    const timerDuration = Number(req.body.timerDuration ?? 300);

    if (topic.length < 5 || topic.length > 150) {
      throw new AppError("Topic must be between 5 and 150 characters", 400);
    }
    if (
      !Number.isInteger(numParticipants) ||
      numParticipants < MIN_PARTICIPANTS ||
      numParticipants > MAX_PARTICIPANTS
    ) {
      throw new AppError(
        `Participants must be between ${MIN_PARTICIPANTS} and ${MAX_PARTICIPANTS}`,
        400,
      );
    }
    if (
      !Number.isInteger(timerDuration) ||
      timerDuration < MIN_TIMER_SECONDS ||
      timerDuration > MAX_TIMER_SECONDS
    ) {
      throw new AppError(
        `Timer must be between ${MIN_TIMER_SECONDS} and ${MAX_TIMER_SECONDS} seconds`,
        400,
      );
    }

    const user = await User.findById(userId).select("name").lean();
    const userName = (user?.name ?? "").trim().split(/\s+/)[0] || "Participant";

    // The AI call is the slow part. If it fails we fall back to built-in
    // personas rather than failing the whole start.
    let generated: PersonaDraft[] = [];
    try {
      generated = await generatePersonas(topic, numParticipants, [userName]);
    } catch (error) {
      console.error("GD persona generation failed, using fallbacks:", error);
    }
    const drafts = finalizePersonas(generated, numParticipants, userName);

    // Created AFTER persona generation so the timer doesn't include setup time.
    const session = await GDSession.create({
      userId,
      userName,
      topic,
      numParticipants,
      timerDuration,
    });

    const personaDocs = await GDPersona.insertMany(
      drafts.map((draft, index) => ({
        sessionId: session._id,
        name: draft.name,
        personalityTrait: draft.personalityTrait,
        stance: draft.stance,
        voiceIndex: index,
      })),
    );
    const personas = personaDocs.map(toPersonaLite);
    cachePersonas(session._id.toString(), personas);

    return sendSuccess(
      res,
      {
        sessionId: session._id.toString(),
        topic,
        numParticipants,
        timerDuration,
        remainingSeconds: remainingSecondsFor(session),
        userName,
        personas,
      },
      "Group discussion started",
      201,
    );
  },
);

// ---------------------------------------------------------------------------
// POST /api/gd/:id/next-turn
// ---------------------------------------------------------------------------

export const nextTurn = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await getOwnedSession(String(req.params.id), req.userId);
    const sessionId = session._id.toString();

    if (turnLocks.has(sessionId)) {
      throw new AppError("A turn is already being prepared. Retry shortly.", 409);
    }
    turnLocks.add(sessionId);

    try {
      const result = await buildNextTurn(session, {
        aiTurnsSinceUser: session.aiTurnsSinceUser,
        totalAiTurns: session.totalAiTurns,
      });
      return sendSuccess(res, result, "Next turn ready");
    } finally {
      turnLocks.delete(sessionId);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/gd/:id/message   { text } | { skipped: true }
//
// Saves the user's turn AND returns the next turn in the same response, which
// removes one full network round trip right when the user is waiting.
// ---------------------------------------------------------------------------

export const submitMessage = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await getOwnedSession(String(req.params.id), req.userId);
    const sessionId = session._id.toString();

    if (session.status === "COMPLETED") {
      throw new AppError("This discussion has already ended", 400);
    }

    const skipped = req.body.skipped === true;
    const text =
      typeof req.body.text === "string" ? req.body.text.trim() : "";

    if (!skipped && !text) {
      throw new AppError("Message text is required", 400);
    }

    let savedMessage: {
      id: string;
      speaker: string;
      speakerName: string;
      text: string;
      timestamp: Date;
    } | null = null;

    if (skipped) {
      await GDSession.updateOne(
        { _id: session._id },
        { $set: { aiTurnsSinceUser: 0 } },
      );
    } else {
      const [message] = await Promise.all([
        GDMessage.create({
          sessionId: session._id,
          speaker: "user",
          speakerName: session.userName,
          text: text.slice(0, MAX_USER_MESSAGE_CHARS),
        }),
        GDSession.updateOne(
          { _id: session._id },
          { $set: { aiTurnsSinceUser: 0 } },
        ),
      ]);
      savedMessage = {
        id: message._id.toString(),
        speaker: "user",
        speakerName: message.speakerName,
        text: message.text,
        timestamp: message.timestamp,
      };
    }

    // If a turn is somehow already in flight, don't fail the save — just let
    // the client request the next turn separately.
    let nextTurnResult: NextTurnResult | null = null;
    if (!turnLocks.has(sessionId)) {
      turnLocks.add(sessionId);
      try {
        nextTurnResult = await buildNextTurn(session, {
          aiTurnsSinceUser: 0,
          totalAiTurns: session.totalAiTurns,
        });
      } finally {
        turnLocks.delete(sessionId);
      }
    }

    return sendSuccess(
      res,
      { message: savedMessage, nextTurn: nextTurnResult },
      "Message saved",
    );
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/gd/:id/end
// ---------------------------------------------------------------------------

const formatFeedback = (doc: {
  clarity: number;
  relevance: number;
  engagement: number;
  initiative: number;
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}) => ({
  clarity: doc.clarity,
  relevance: doc.relevance,
  engagement: doc.engagement,
  initiative: doc.initiative,
  overallScore: doc.overallScore,
  summary: doc.summary,
  strengths: doc.strengths ?? [],
  improvements: doc.improvements ?? [],
});

export const endSession = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await getOwnedSession(String(req.params.id), req.userId);
    const sessionId = session._id.toString();

    // Idempotent: timer-end and a manual "End" click can both fire.
    const existing = await GDFeedback.findOne({ sessionId: session._id });
    if (session.status === "COMPLETED" && existing) {
      return sendSuccess(
        res,
        formatFeedback(existing),
        "Group discussion already completed",
      );
    }

    if (endLocks.has(sessionId)) {
      throw new AppError("Feedback is already being generated. Retry shortly.", 409);
    }
    endLocks.add(sessionId);

    try {
      const messages = await GDMessage.find({ sessionId: session._id })
        .sort({ timestamp: 1, _id: 1 })
        .select("speaker speakerName text")
        .lean();

      const userMessageCount = messages.filter((m) => m.speaker === "user").length;

      let scores: GDEvaluation;
      if (userMessageCount === 0) {
        // Nothing to evaluate — skip the LLM call entirely (saves tokens and
        // avoids the model inventing scores for a silent participant).
        scores = {
          clarity: 0,
          relevance: 0,
          engagement: 0,
          initiative: 0,
          summary:
            "You didn't speak during this discussion, so there was nothing to evaluate. Try contributing at least a few points next time.",
          strengths: [],
          improvements: [
            "Speak up when it's your turn, even with a short point.",
          ],
        };
      } else {
        try {
          scores = await evaluateGDPerformance({
            topic: session.topic,
            userName: session.userName,
            messages: messages.map((m) => ({
              speaker: m.speaker,
              speakerName: m.speakerName,
              text: m.text,
            })),
          });
        } catch (error) {
          // Leave the session ONGOING so the client can retry ending it,
          // instead of completing it with no feedback.
          console.error("GD feedback generation failed:", error);
          throw new AppError(
            `Couldn't generate your feedback right now. Please retry.${devDetail(error)}`,
            502,
          );
        }
      }

      const overallScore =
        userMessageCount === 0
          ? 0
          : Math.round(
              ((scores.clarity +
                scores.relevance +
                scores.engagement +
                scores.initiative) /
                4) *
                10,
            ) / 10;

      const feedback = await GDFeedback.findOneAndUpdate(
        { sessionId: session._id },
        { $set: { ...scores, overallScore } },
        { upsert: true, new: true },
      );

      if (!feedback) {
        throw new AppError("Couldn't save your feedback. Please retry.", 500);
      }

      await GDSession.updateOne(
        { _id: session._id },
        { $set: { status: "COMPLETED", endTime: new Date() } },
      );
      personaCache.delete(sessionId);

      return sendSuccess(
        res,
        formatFeedback(feedback),
        "Group discussion completed",
      );
    } finally {
      endLocks.delete(sessionId);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/gd/:id
// ---------------------------------------------------------------------------

export const getSessionById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await getOwnedSession(String(req.params.id), req.userId);

    const [personas, messages, feedback] = await Promise.all([
      getPersonas(session._id.toString()),
      GDMessage.find({ sessionId: session._id })
        .sort({ timestamp: 1, _id: 1 })
        .lean(),
      GDFeedback.findOne({ sessionId: session._id }),
    ]);

    return sendSuccess(
      res,
      {
        id: session._id.toString(),
        topic: session.topic,
        userName: session.userName,
        numParticipants: session.numParticipants,
        timerDuration: session.timerDuration,
        status: session.status,
        remainingSeconds: remainingSecondsFor(session),
        startTime: session.startTime,
        endTime: session.endTime ?? null,
        personas,
        messages: messages.map((m) => ({
          id: m._id.toString(),
          speaker: m.speaker,
          speakerName: m.speakerName,
          text: m.text,
          timestamp: m.timestamp,
        })),
        feedback: feedback ? formatFeedback(feedback) : null,
      },
      "Group discussion retrieved successfully",
    );
  },
);

// ---------------------------------------------------------------------------
// GET /api/gd/history
// ---------------------------------------------------------------------------

export const getSessionHistory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const sessions = await GDSession.find({ userId: req.userId }).sort({
      createdAt: -1,
    });

    if (sessions.length === 0) {
      return sendSuccess(res, [], "No group discussions found.");
    }

    const feedbacks = await GDFeedback.find({
      sessionId: { $in: sessions.map((s) => s._id) },
    });
    const scoreBySession = new Map<string, number>(
      feedbacks.map((f): [string, number] => [
        f.sessionId.toString(),
        f.overallScore,
      ]),
    );

    return sendSuccess(
      res,
      sessions.map((s) => ({
        sessionId: s._id.toString(),
        topic: s.topic,
        numParticipants: s.numParticipants,
        timerDuration: s.timerDuration,
        status: s.status,
        score: scoreBySession.get(s._id.toString()) ?? null,
        date: s.startTime,
      })),
      "Group discussion history retrieved successfully",
    );
  },
);
