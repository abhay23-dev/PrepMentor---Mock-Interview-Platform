import type { MessageLite } from "./gdOrchestrator.js";
export interface PersonaDraft {
    name: string;
    personalityTrait: string;
    stance: string;
}
export declare const FALLBACK_PERSONAS: PersonaDraft[];
export declare const generatePersonas: (topic: string, count: number, avoidNames: string[]) => Promise<PersonaDraft[]>;
export interface PersonaReplyParams {
    personaName: string;
    personalityTrait: string;
    stance: string;
    topic: string;
    userName: string;
    recent: MessageLite[];
    wrapUp: boolean;
}
export declare const cleanReply: (raw: string, name: string) => string;
export declare const generatePersonaReply: (params: PersonaReplyParams) => Promise<string>;
export interface GDEvaluation {
    clarity: number;
    relevance: number;
    engagement: number;
    initiative: number;
    summary: string;
    strengths: string[];
    improvements: string[];
}
export declare const evaluateGDPerformance: (params: {
    topic: string;
    userName: string;
    messages: MessageLite[];
}) => Promise<GDEvaluation>;
