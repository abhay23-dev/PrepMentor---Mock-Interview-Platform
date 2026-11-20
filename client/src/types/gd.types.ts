// ---- Shapes returned by the backend ----

export interface GDPersona {
  id: string;
  name: string;
  personalityTrait: string;
  stance: string;
  voiceIndex: number;
}

export interface GDMessageItem {
  id: string;
  speaker: string; // persona id or "user"
  speakerName: string;
  text: string;
  timestamp: string;
}

export interface GDFeedback {
  clarity: number;
  relevance: number;
  engagement: number;
  initiative: number;
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

export interface StartGDRequest {
  topic: string;
  numParticipants: number;
  timerDuration: number; // seconds
}

export interface StartGDResponse {
  sessionId: string;
  topic: string;
  numParticipants: number;
  timerDuration: number;
  remainingSeconds: number;
  userName: string;
  personas: GDPersona[];
}

export interface NextTurnResponse {
  finished: boolean;
  remainingSeconds: number;
  speaker?: string; // persona id or "user"
  speakerName?: string;
  text?: string;
  messageId?: string;
  wrapUp?: boolean;
}

export interface SendMessageRequest {
  text?: string;
  skipped?: boolean;
}

export interface SendMessageResponse {
  message: GDMessageItem | null;
  nextTurn: NextTurnResponse | null;
}

export interface GDSessionDetail {
  id: string;
  topic: string;
  userName: string;
  numParticipants: number;
  timerDuration: number;
  status: "ONGOING" | "COMPLETED";
  remainingSeconds: number;
  personas: GDPersona[];
  messages: GDMessageItem[];
  feedback: GDFeedback | null;
}

export interface GDHistoryItem {
  sessionId: string;
  topic: string;
  numParticipants: number;
  timerDuration: number;
  status: "ONGOING" | "COMPLETED";
  score: number | null;
  date: string;
}

// ---- Store ----

// IDLE     nothing loaded
// LOADING  fetching a session from the server
// READY    session loaded, loop not running (fresh start, or after a reload)
// RUNNING  discussion loop active
// ENDING   finishing up / generating feedback (stays here with `error` set if it failed)
// FINISHED feedback available
export type GDPhase =
  | "IDLE"
  | "LOADING"
  | "READY"
  | "RUNNING"
  | "ENDING"
  | "FINISHED";

export interface GDStoreState {
  sessionId: string | null;
  topic: string;
  userName: string;
  timerDuration: number;
  personas: GDPersona[];
  messages: GDMessageItem[];
  feedback: GDFeedback | null;

  phase: GDPhase;
  remainingSeconds: number;
  wrapUpWarned: boolean;

  activeSpeakerId: string | null; // persona id, "user", or null
  isThinking: boolean; // waiting on the AI to produce the next line
  isUserTurn: boolean;
  isListening: boolean;
  interimText: string;
  micError: string | null;

  // true after a page reload: browsers only allow audio / mic after a click,
  // so the user must press "Resume" before the loop can start.
  needsGesture: boolean;
  isStarting: boolean;
  error: string | null;
}

export interface GDStoreActions {
  startSession: (
    topic: string,
    numParticipants: number,
    timerDuration: number,
  ) => Promise<string>;
  loadSession: (sessionId: string) => Promise<void>;
  begin: () => void;
  stopLoop: () => void;
  finishSpeaking: () => void; // "Done" button
  skipTurn: () => void;
  skipSpeech: () => void; // skip the AI line currently being spoken
  submitTyped: (text: string) => void;
  endSession: () => Promise<void>;
  reset: () => void;
}

export type GDStore = GDStoreState & GDStoreActions;
