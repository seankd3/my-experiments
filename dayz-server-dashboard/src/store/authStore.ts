import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  clearError: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('dayz_token'),
  isAuthenticated: !!localStorage.getItem('dayz_token'),
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('dayz_token', data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  register: async (username: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      localStorage.setItem('dayz_token', data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('dayz_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateProfile: async (data: Partial<User>) => {
    const { token } = get();
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Update failed');
      set({ user: updated.user });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      set({ error: message });
    }
  },

  setUser: (user: User) => set({ user }),
  setToken: (token: string) => {
    localStorage.setItem('dayz_token', token);
    set({ token, isAuthenticated: true });
  },
  clearError: () => set({ error: null }),

  initialize: async () => {
    const token = localStorage.getItem('dayz_token');
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user, isAuthenticated: true });
      } else {
        localStorage.removeItem('dayz_token');
        set({ token: null, isAuthenticated: false });
      }
    } catch {
      // If we can't reach the server, keep the token for retry
    }
  },
}));
