// Pure turn-orchestration logic for the group discussion feature.
// No DB, no LLM — just "who speaks next". Keeping it pure makes it instant
// to run and easy to unit test.

export const MAX_AI_TURNS_WITHOUT_USER = 3; // force the user in after this many AI lines
export const CONTEXT_MESSAGES = 8; // how many recent messages the LLM sees
export const WRAP_UP_SECONDS = 30; // personas start closing remarks at this point
export const MAX_AI_TURNS_PER_SESSION = 60; // hard cost cap per session

export interface PersonaLite {
  id: string;
  name: string;
  personalityTrait: string;
  stance: string;
  voiceIndex: number;
}

export interface MessageLite {
  speaker: string; // persona id or "user"
  speakerName: string;
  text: string;
}

export type SpeakerChoice =
  | { type: "user" }
  | { type: "ai"; persona: PersonaLite };

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
 * - After MAX_AI_TURNS_WITHOUT_USER consecutive AI lines, it's the user's turn.
 * - Otherwise pick a persona, weighted by how long ago they last spoke
 *   (quiet personas are more likely), and never the same persona twice in a row.
 */
export const pickNextSpeaker = (
  personas: PersonaLite[],
  recent: MessageLite[], // chronological: oldest -> newest
  aiTurnsSinceUser: number,
  rng: () => number = Math.random,
): SpeakerChoice => {
  if (aiTurnsSinceUser >= MAX_AI_TURNS_WITHOUT_USER) {
    return { type: "user" };
  }

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

  return {
    type: "ai",
    persona: weightedRandomPick(personas, weights, rng),
  };
};
