import api from "./api";
import type {
  StartInterviewRequest,
  StartInterviewResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  EndInterviewResponse,
  InterviewHistoryItem,
} from "@/types/interview.types";

const startInterview = async (
  data: StartInterviewRequest,
): Promise<StartInterviewResponse> => {
  const response = await api.post("/interview", data);
  return response.data.data;
};

const submitAnswer = async (
  interviewId: string,
  data: SubmitAnswerRequest,
): Promise<SubmitAnswerResponse> => {
  const response = await api.post(`/interview/${interviewId}/answer`, data);
  return response.data.data;
};

const getHistory = async (): Promise<InterviewHistoryItem[]> => {
  const response = await api.get("/interview/history");
  return response.data.data;
};

const getInterviewById = async (interviewId: string) => {
  const response = await api.get(`/interview/${interviewId}`);
  return response.data.data;
};

const endInterview = async (
  interviewId: string,
): Promise<EndInterviewResponse> => {
  const response = await api.patch(`/interview/${interviewId}/end`);
  return response.data.data;
};

export const interviewService = {
  startInterview,
  submitAnswer,
  getHistory,
  getInterviewById,
  endInterview,
};
