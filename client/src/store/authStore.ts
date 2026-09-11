import { authService } from "@/services/authService";
import { TOKEN_KEY } from "@/constants/app.constants";
import type { AuthStore } from "@/types/auth.types";
import { create } from "zustand";

export const useAuthStore = create<AuthStore>((set) => ({
  user:null,
  token: null,
  isAuthenticated: false,
  // Starts true (not false) because __root.tsx always calls initializeAuth()
  // on mount. If this started false, ProtectedRoute would see
  // isLoading=false/isAuthenticated=false for one render before that async
  // check finishes, and redirect to /login even when a valid token exists.
  isLoading: true,

  signup: async (name: string, email: string, password: string) => {
  set({ isLoading: true });

  try {
    await authService.signup({
      name,
      email,
      password,
    });
  } catch (error) {
    throw error;
  } finally {
    set({ isLoading: false });
  }
},
  login: async (email: string, password: string) => {
    set({
      isLoading: true
    });
    try {
      const data = await authService.login({email, password});
      localStorage.setItem(TOKEN_KEY, data.token?? "");
      set({
        user: data.user,
        token: data.token ?? null,
        isAuthenticated: true,
      });
    } catch(error) {
      throw error;
    } finally {
      set({
        isLoading: false,
      });
    }
    
  }, 
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
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
      const token = localStorage.getItem(TOKEN_KEY);
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
      localStorage.removeItem(TOKEN_KEY);

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