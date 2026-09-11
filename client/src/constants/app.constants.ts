// Single source of truth for the localStorage key used to persist the JWT.
//
// This used to be duplicated: api.ts read `import.meta.env.VITE_TOKEN_KEY`
// while authStore.ts wrote to a hardcoded "token" key. When VITE_TOKEN_KEY
// was blank/unset in .env, api.ts ended up reading a key that authStore
// never wrote to, so the Authorization header was never attached, every
// protected request came back 401, and the response interceptor bounced
// the user straight to /login. Importing this constant everywhere the
// token is read or written keeps the two in sync permanently.
export const TOKEN_KEY = import.meta.env.VITE_TOKEN_KEY || "token";
