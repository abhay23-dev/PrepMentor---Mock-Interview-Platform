interface GeneratedQuestion {
    questionText: string;
    keywords: string[];
}
interface AnswerEvaluation {
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    feedback: string;
    idealAnswer: string;
}
interface AnswerForSummary {
    questionText: string;
    transcript: string;
    score: number;
}
export declare const generateInterviewQuestion: (topicLabel: string, difficulty: string, avoidQuestionTexts: string[]) => Promise<GeneratedQuestion>;
export declare const evaluateAnswer: (questionText: string, keywords: string[], userAnswer: string) => Promise<AnswerEvaluation>;
export declare const generateOverallSummary: (topic: string, answers: AnswerForSummary[]) => Promise<string>;
export {};
