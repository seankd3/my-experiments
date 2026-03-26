import { create } from "zustand";

export interface VisualPanel {
  id: string;
  html: string;
  css: string;
  js: string;
  title: string;
  timestamp: number;
}

interface AppState {
  panels: VisualPanel[];
  isConnected: boolean;
  isLoading: boolean;
  statusText: string;
  addPanel: (panel: VisualPanel) => void;
  clearPanels: () => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setStatusText: (text: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  panels: [],
  isConnected: false,
  isLoading: false,
  statusText: "",

  addPanel: (panel) =>
    set((state) => ({
      panels: [...state.panels, panel],
    })),

  clearPanels: () => set({ panels: [] }),

  setConnected: (connected) => set({ isConnected: connected }),

  setLoading: (loading) => set({ isLoading: loading }),

  setStatusText: (text) => set({ statusText: text }),
}));
