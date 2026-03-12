import { create } from 'zustand';
import type { Toast, ToastType } from '../types';

interface ToastState {
  toasts: Toast[];
  addToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

let toastId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (type, title, message, duration = 5000) => {
    const id = `toast-${++toastId}`;
    set((state) => ({
      toasts: [...state.toasts, { id, type, title, message, duration }],
    }));
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
