// Pure "who speaks, and how do they interact" logic for the group discussion.
// No DB, no LLM: just rules with bounded randomness. Keeping it pure makes it
// instant to run and easy to unit test.

export const CONTEXT_MESSAGES = 8; // how many recent messages the LLM sees
export const WRAP_UP_SECONDS = 30; // personas start closing remarks at this point
export const MAX_AI_TURNS_PER_SESSION = 80; // hard cost cap per session

// After this many AI lines in a row, one persona asks the user a direct question.
export const INVITE_USER_AFTER_AI_TURNS = 4;

// --- AI-to-AI interruption limits (what keeps it "controlled") ---
export const MIN_TURNS_BEFORE_INTERRUPT = 2; // let the discussion warm up first
export const INTERRUPT_COOLDOWN_TURNS = 3; // at most one attempt per this many lines
export const MAX_INTERRUPTS_PER_SESSION = 8; // overall budget

export interface PersonaLite {
  id: string;
  name: string;
  personalityTrait: string;
  stance: string;
  voiceIndex: number;
  assertiveness: number; // 0..1
}

export interface MessageLite {
  speaker: string; // persona id or "user"
  speakerName: string;
  text: string;
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// IMPORTANT: the client uses this exact same splitting for text-to-speech, so
// "sentence N" means the same thing on both sides. Keep them identical.
export const splitSentences = (text: string): string[] => {
  const parts =
    text.replace(/\s+/g, " ").trim().match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g) ?? [];
  return parts.map((p) => p.trim()).filter(Boolean);
};

export const weightedRandomPick = <T>(
  items: T[],
  weights: number[],
  rng: () => number = Math.random,
): T => {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) {
    return items[Math.floor(rng() * items.length)];
  }
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
};

/**
 * Picks the next AI speaker. Personas who have been quiet longer are more
 * likely, and nobody speaks twice in a row. (The user is never "scheduled":
 * they take the floor themselves whenever they speak.)
 */
export const pickNextSpeaker = (
  personas: PersonaLite[],
  recent: MessageLite[], // chronological: oldest -> newest
  rng: () => number = Math.random,
): PersonaLite => {
  const lastSpeaker = recent.length ? recent[recent.length - 1].speaker : null;

  const weights = personas.map((persona) => {
    if (personas.length > 1 && persona.id === lastSpeaker) return 0;

    // Not in the recent window at all => has been quiet the longest.
    let turnsSinceSpoke = recent.length + 1;
    for (let i = recent.length - 1; i >= 0; i--) {
      if (recent[i].speaker === persona.id) {
        turnsSinceSpoke = recent.length - 1 - i;
        break;
      }
    }
    return turnsSinceSpoke + 1;
  });

  return weightedRandomPick(personas, weights, rng);
};

/** True when the next AI line should be a direct question to the user. */
export const shouldInviteUser = (aiTurnsSinceUser: number, wrapUp: boolean) =>
  !wrapUp && aiTurnsSinceUser >= INVITE_USER_AFTER_AI_TURNS;

// ---------------------------------------------------------------------------
// AI-to-AI interruption
// ---------------------------------------------------------------------------

export interface InterruptPlan {
  interrupt: boolean; // the next speaker tries to cut in on the current one
  succeeds: boolean; // the current speaker yields (false = they hold the floor)
  atSentence: number; // cut happens after this many sentences of the current line
}

export const NO_INTERRUPT: InterruptPlan = {
  interrupt: false,
  succeeds: false,
  atSentence: 0,
};

export interface InterruptContext {
  current: PersonaLite; // who is speaking right now
  interrupter: PersonaLite; // who wants to speak next
  currentSentenceCount: number;
  totalAiTurns: number;
  lastInterruptTurn: number;
  interruptsUsed: number;
}

/**
 * Decides whether the next speaker tries to cut in on the current speaker,
 * and whether the attempt works.
 *
 * It is deliberately conservative:
 *  - never early in the discussion, never back-to-back (cooldown), and never
 *    more than a fixed number of times per session;
 *  - only when the current line has at least 2 sentences, so the speaker always
 *    gets to make a point first, and only ever at a sentence boundary;
 *  - an assertive interrupter tries more often; an assertive current speaker is
 *    harder to interrupt, so many attempts fail and the speaker holds the floor.
 */
export const planInterruption = (
  context: InterruptContext,
  rng: () => number = Math.random,
): InterruptPlan => {
  const {
    current,
    interrupter,
    currentSentenceCount,
    totalAiTurns,
    lastInterruptTurn,
    interruptsUsed,
  } = context;

  if (currentSentenceCount < 2) return NO_INTERRUPT;
  if (totalAiTurns < MIN_TURNS_BEFORE_INTERRUPT) return NO_INTERRUPT;
  if (totalAiTurns - lastInterruptTurn < INTERRUPT_COOLDOWN_TURNS) return NO_INTERRUPT;
  if (interruptsUsed >= MAX_INTERRUPTS_PER_SESSION) return NO_INTERRUPT;

  const attemptChance = clamp(
    0.08 + 0.5 * interrupter.assertiveness - 0.15 * current.assertiveness,
    0,
    0.5,
  );
  if (rng() >= attemptChance) return NO_INTERRUPT;

  const yieldChance = clamp(
    0.7 - 0.5 * current.assertiveness + 0.4 * (interrupter.assertiveness - 0.5),
    0.15,
    0.9,
  );

  return {
    interrupt: true,
    succeeds: rng() < yieldChance,
    // 1 .. currentSentenceCount - 1: at least one full sentence is heard first
    atSentence: 1 + Math.floor(rng() * (currentSentenceCount - 1)),
  };
};
