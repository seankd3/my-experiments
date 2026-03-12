import { create } from 'zustand';
import type { Server, ServerStatus, Player, ChatMessage } from '../types';

interface ServerState {
  activeServer: Server | null;
  servers: Server[];
  serverStatus: ServerStatus | null;
  onlinePlayers: Player[];
  chatMessages: ChatMessage[];
  rconConnected: boolean;
  wsConnection: WebSocket | null;
  isConnecting: boolean;

  setActiveServer: (server: Server) => void;
  setServers: (servers: Server[]) => void;
  setServerStatus: (status: ServerStatus) => void;
  setOnlinePlayers: (players: Player[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  setChatMessages: (messages: ChatMessage[]) => void;

  connectRcon: (serverId: string) => Promise<void>;
  disconnectRcon: () => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}

export const useServerStore = create<ServerState>((set, get) => ({
  activeServer: null,
  servers: [],
  serverStatus: null,
  onlinePlayers: [],
  chatMessages: [],
  rconConnected: false,
  wsConnection: null,
  isConnecting: false,

  setActiveServer: (server) => set({ activeServer: server }),
  setServers: (servers) => set({ servers }),
  setServerStatus: (status) => set({ serverStatus: status }),
  setOnlinePlayers: (players) => set({ onlinePlayers: players }),
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-500), message],
    })),
  setChatMessages: (messages) => set({ chatMessages: messages }),

  connectRcon: async (serverId: string) => {
    set({ isConnecting: true });
    try {
      const token = localStorage.getItem('dayz_token');
      const res = await fetch(`/api/servers/${serverId}/rcon/connect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('RCON connection failed');
      set({ rconConnected: true, isConnecting: false });
      // Start WebSocket after RCON connection
      get().connectWebSocket();
    } catch {
      set({ rconConnected: false, isConnecting: false });
    }
  },

  disconnectRcon: () => {
    const { activeServer } = get();
    if (activeServer) {
      const token = localStorage.getItem('dayz_token');
      fetch(`/api/servers/${activeServer.id}/rcon/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    get().disconnectWebSocket();
    set({ rconConnected: false });
  },

  connectWebSocket: () => {
    const { wsConnection, activeServer } = get();
    if (wsConnection) wsConnection.close();

    const token = localStorage.getItem('dayz_token');
    if (!token || !activeServer) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/ws?token=${token}&serverId=${activeServer.id}`
    );

    ws.onopen = () => {
      set({ wsConnection: ws });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'chat':
            get().addChatMessage(data.payload);
            break;
          case 'players':
            set({ onlinePlayers: data.payload });
            break;
          case 'status':
            set({ serverStatus: data.payload });
            break;
          case 'player_join':
            set((state) => ({
              onlinePlayers: [...state.onlinePlayers, data.payload],
            }));
            break;
          case 'player_leave':
            set((state) => ({
              onlinePlayers: state.onlinePlayers.filter(
                (p) => p.id !== data.payload.id
              ),
            }));
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      set({ wsConnection: null });
      // Reconnect after delay if still connected to RCON
      setTimeout(() => {
        if (get().rconConnected) {
          get().connectWebSocket();
        }
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  },

  disconnectWebSocket: () => {
    const { wsConnection } = get();
    if (wsConnection) {
      wsConnection.close();
      set({ wsConnection: null });
    }
  },
}));
