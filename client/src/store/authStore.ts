import { authService } from "@/services/authService";
import type { AuthStore } from "@/types/auth.types";
import { create } from "zustand";

export const useAuthStore = create<AuthStore>((set) => ({
  user:null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  signup: async (name: string, email: string, password: string) => {
    await authService.signup({name, email, password});
  }, 
  login: async (email: string, password: string) => {
    const data = await authService.login({email, password});
    localStorage.setItem("token", data.token?? "");
    set({
      user: data.user,
      token: data.token ?? null,
      isAuthenticated: true,
    })
  }, 
  logout: () => {
    localStorage.removeItem("token");
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    })
  }, 
  initializeAuth: async () => {
    set({
      isLoading: true
    });
    try {
      const token = localStorage.getItem("token");
      if(!token) {
        set({
          isLoading: false,
        });
        return;
      }

      const user = await authService.getCurrentUser();
      set({
        user,
        token,
        isAuthenticated: true,
      });
    }
    catch(error) {
      localStorage.removeItem("token");

      set({
        user: null,
        token: null,
        isAuthenticated: false
      });
    } finally{
      set({
        isLoading: false
      })
    }
  }
}))