import api from "./api";
import type { InterviewFeedbackResponse } from "@/types/interview.types";
 
const getFeedback = async (
  interviewId: string,
): Promise<InterviewFeedbackResponse> => {
  const response = await api.get(`/feedback/${interviewId}`);
  return response.data.data;
};
 
export const feedbackService = {
  getFeedback,
};