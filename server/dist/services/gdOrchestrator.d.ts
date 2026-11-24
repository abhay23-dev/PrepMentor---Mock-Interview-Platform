export declare const MAX_AI_TURNS_WITHOUT_USER = 3;
export declare const CONTEXT_MESSAGES = 8;
export declare const WRAP_UP_SECONDS = 30;
export declare const MAX_AI_TURNS_PER_SESSION = 60;
export interface PersonaLite {
    id: string;
    name: string;
    personalityTrait: string;
    stance: string;
    voiceIndex: number;
}
export interface MessageLite {
    speaker: string;
    speakerName: string;
    text: string;
}
export type SpeakerChoice = {
    type: "user";
} | {
    type: "ai";
    persona: PersonaLite;
};
export declare const weightedRandomPick: <T>(items: T[], weights: number[], rng?: () => number) => T;
/**
 * - After MAX_AI_TURNS_WITHOUT_USER consecutive AI lines, it's the user's turn.
 * - Otherwise pick a persona, weighted by how long ago they last spoke
 *   (quiet personas are more likely), and never the same persona twice in a row.
 */
export declare const pickNextSpeaker: (personas: PersonaLite[], recent: MessageLite[], // chronological: oldest -> newest
aiTurnsSinceUser: number, rng?: () => number) => SpeakerChoice;
