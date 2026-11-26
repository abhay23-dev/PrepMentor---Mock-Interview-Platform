import api from "./api";
import type {
  GDFeedback,
  InterruptedInfo,
  GDHistoryItem,
  GDSessionDetail,
  NextTurnResponse,
  SendMessageRequest,
  SendMessageResponse,
  StartGDRequest,
  StartGDResponse,
} from "@/types/gd.types";

const startSession = async (data: StartGDRequest): Promise<StartGDResponse> => {
  // Persona generation is an LLM call, so allow a bit more time than usual.
  const response = await api.post("/gd/start", data, { timeout: 30000 });
  return response.data.data;
};

const nextTurn = async (
  sessionId: string,
  interrupted?: InterruptedInfo,
): Promise<NextTurnResponse> => {
  const response = await api.post(
    `/gd/${sessionId}/next-turn`,
    interrupted ? { interrupted } : {},
    { timeout: 20000 },
  );
  return response.data.data;
};

const sendMessage = async (
  sessionId: string,
  data: SendMessageRequest,
): Promise<SendMessageResponse> => {
  const response = await api.post(`/gd/${sessionId}/message`, data, {
    timeout: 25000,
  });
  return response.data.data;
};

const endSession = async (sessionId: string): Promise<GDFeedback> => {
  const response = await api.patch(`/gd/${sessionId}/end`, {}, { timeout: 30000 });
  return response.data.data;
};

const getSession = async (sessionId: string): Promise<GDSessionDetail> => {
  const response = await api.get(`/gd/${sessionId}`);
  return response.data.data;
};

const getHistory = async (): Promise<GDHistoryItem[]> => {
  const response = await api.get("/gd/history");
  return response.data.data;
};

export const gdService = {
  startSession,
  nextTurn,
  sendMessage,
  endSession,
  getSession,
  getHistory,
};
