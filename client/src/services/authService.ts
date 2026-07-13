import type { LoginRequest, SignupRequest } from "@/types/auth.types";
import api from "./api";

const signup = async(data: SignupRequest) => {
  const response = await api.post("/auth/signup",data);
  return response.data.data;
}

const login = async(data: LoginRequest) => {
  const response = await api.post("/auth/login", data);
  return response.data.data;
}

const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data.data;
}

export const authService = {
  signup, 
  login,
  getCurrentUser
};