// ---- Shapes returned by the backend ----

export interface GDPersona {
  id: string;
  name: string;
  personalityTrait: string;
  stance: string;
  voiceIndex: number;
  assertiveness: number; // 0..1: how likely to interrupt / hold the floor
}

export interface GDMessageItem {
  id: string;
  speaker: string; // persona id or "user"
  speakerName: string;
  text: string;
  timestamp: string;
  interrupted?: boolean; // the speaker was cut off before finishing
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

// How a line enters relative to the line still being spoken.
export interface InterruptPlan {
  interrupt: boolean; // this speaker tries to cut in
  succeeds: boolean; // the current speaker yields (false = they hold the floor)
  atSentence: number; // cut after this many sentences of the current line
}

export interface NextTurnResponse {
  finished: boolean;
  remainingSeconds: number;
  speaker?: string; // always an AI persona id
  speakerName?: string;
  text?: string;
  messageId?: string;
  wrapUp?: boolean;
  plan?: InterruptPlan;
  invitesUser?: boolean; // the line ends with a direct question to the user
}

// What was actually heard when an AI line was cut off.
export interface InterruptedInfo {
  messageId: string;
  spokenText: string;
}

export interface SendMessageRequest {
  text?: string;
  interrupted?: InterruptedInfo;
  discard?: string[]; // prefetched lines that were never spoken
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

  activeSpeakerId: string | null; // persona currently speaking, or null
  wantsToSpeakId: string | null; // persona trying to cut in
  isThinking: boolean; // waiting on the AI to produce the next line
  userSpeaking: boolean; // the user is talking (mic picked up real speech)
  talkingOver: boolean; // the user is talking while an AI holds the floor
  invitingUser: boolean; // an AI just asked the user a question and is waiting
  isListening: boolean; // microphone is on
  interimText: string;
  micError: string | null;
  bargeInEnabled: boolean; // false = mic ignored while an AI speaks (no headphones)

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
  sendNow: () => void; // finish what the user is saying right now
  skipSpeech: () => void; // stop the AI line currently being spoken
  submitTyped: (text: string) => void;
  setBargeIn: (enabled: boolean) => void;
  endSession: () => Promise<void>;
  reset: () => void;
}

export type GDStore = GDStoreState & GDStoreActions;
