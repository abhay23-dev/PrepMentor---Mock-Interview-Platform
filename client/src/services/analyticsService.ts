import api from "./api";
import type { AnalyticsResponse } from "@/types/analytics.types";

const getAnalytics = async (): Promise<AnalyticsResponse> => {
  const response = await api.get("/analytics");
  return response.data.data;
};

export const analyticsService = {
  getAnalytics,
};
