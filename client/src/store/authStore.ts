import { authService } from "@/services/authService";
import type { AuthStore } from "@/types/auth.types";
import { create } from "zustand";
import { TOKEN_KEY } from "@/constants/auth.constants";

export const useAuthStore = create<AuthStore>((set) => ({
  user:null,
  token: null,
  isAuthenticated: false,
  // Starts true (not false) on purpose: until initializeAuth has actually
  // run once, we don't yet know whether the user is logged in or not.
  // If this started false, any route guard that reads isAuthenticated
  // before initializeAuth finishes would wrongly see "not authenticated"
  // and redirect to /login, even with a perfectly valid token sitting in
  // localStorage. See ensureAuthInitialized() below for how this gets
  // resolved exactly once and awaited by the router before routes render.
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
      localStorage.setItem(TOKEN_KEY, data.token ?? "");
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
      // Was hardcoded as "token" before, which happened to match
      // TOKEN_KEY's default value — but would silently break auth the
      // moment TOKEN_KEY's source (VITE_TOKEN_KEY) ever changed, since
      // this read and login()'s write would then target different keys.
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

// --- Auth bootstrap singleton --------------------------------------------
//
// Problem this solves: initializeAuth() used to be fired from a useEffect
// in the root route's component. React effects run on the *component*
// lifecycle, but TanStack Router's `beforeLoad` guards run during *route
// resolution*, which happens independently of (and often before) that
// effect. So a route guard could check `isAuthenticated` before the
// effect had even started the token check — and since the store starts
// unauthenticated, a perfectly valid logged-in session would get bounced
// to /login. A full page reload (e.g. clicking a plain <a> tag instead of
// a router <Link>) re-triggers this race every time, which is exactly the
// "navigate away and get sent to login" symptom.
//
// Fix: expose a single cached promise for the auth check. The root route's
// `beforeLoad` awaits this before any child route (including protected
// ones) is allowed to resolve, and calling it more than once just returns
// the same in-flight/completed promise instead of re-running the check.
let authInitPromise: Promise<void> | null = null;

export const ensureAuthInitialized = (): Promise<void> => {
  if (!authInitPromise) {
    authInitPromise = useAuthStore.getState().initializeAuth();
  }
  return authInitPromise;
};
