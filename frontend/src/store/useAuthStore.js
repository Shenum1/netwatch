import { create } from "zustand";

const TOKEN_KEY   = "netwatch_token";
const REFRESH_KEY = "netwatch_refresh";

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: sessionStorage.getItem(TOKEN_KEY) || null,
  refreshToken: localStorage.getItem(REFRESH_KEY) || null,
  loading: false,
  error: null,

  setTokens(accessToken, refreshToken, user) {
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    set({ accessToken, refreshToken, user, error: null });
  },

  clearAuth() {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    set({ accessToken: null, refreshToken: null, user: null });
  },

  isAuthenticated() {
    return !!get().accessToken;
  },
}));


