import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TokenPair } from '../types';

export interface AuthUser { id: string; loginId: string; role: 'USER' | 'ADMIN'; }

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  login: (tokens: TokenPair) => void;
  setTokens: (tokens: TokenPair) => void;
  logout: () => void;
}

export function decodeAccessToken(accessToken: string): AuthUser {
  const payload = accessToken.split('.')[1];
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = JSON.parse(atob(base64));
  return { id: decoded.sub, loginId: decoded.loginId, role: decoded.role };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      login: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: decodeAccessToken(tokens.accessToken),
        }),
      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'auth-storage' },
  ),
);
