import { create } from 'zustand';
import type {
  AgentNode,
  AgentStatus,
  Artifact,
  DataflowConnection,
  Message,
  ToolCall,
} from '../protocol/types';

interface AgentStore {
  agents: Record<string, AgentNode>;
  connections: DataflowConnection[];
  selectedAgentId: string | null;
  selectedArtifactId: string | null;

  // Agent CRUD
  addAgent: (agent: AgentNode) => void;
  removeAgent: (id: string) => void;
  updateAgentStatus: (id: string, status: AgentStatus) => void;
  updateAgentPosition: (id: string, position: [number, number, number]) => void;
  setAgentThought: (id: string, thought: string | undefined) => void;

  // Messages
  addMessage: (agentId: string, message: Message) => void;

  // Tool calls
  addToolCall: (agentId: string, toolCall: ToolCall) => void;
  updateToolCall: (agentId: string, toolCallId: string, updates: Partial<ToolCall>) => void;

  // Artifacts
  addArtifact: (agentId: string, artifact: Artifact) => void;

  // Connections
  addConnection: (connection: DataflowConnection) => void;
  removeConnection: (id: string) => void;
  setConnectionActive: (id: string, active: boolean) => void;

  // Selection
  selectAgent: (id: string | null) => void;
  selectArtifact: (id: string | null) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: {},
  connections: [],
  selectedAgentId: null,
  selectedArtifactId: null,

  addAgent: (agent) =>
    set((state) => ({
      agents: { ...state.agents, [agent.id]: agent },
    })),

  removeAgent: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.agents;
      return {
        agents: rest,
        connections: state.connections.filter(
          (c) => c.sourceAgentId !== id && c.targetAgentId !== id
        ),
        selectedAgentId: state.selectedAgentId === id ? null : state.selectedAgentId,
      };
    }),

  updateAgentStatus: (id, status) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [id]: state.agents[id] ? { ...state.agents[id], status } : state.agents[id],
      },
    })),

  updateAgentPosition: (id, position) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [id]: state.agents[id] ? { ...state.agents[id], position } : state.agents[id],
      },
    })),

  setAgentThought: (id, thought) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [id]: state.agents[id]
          ? { ...state.agents[id], currentThought: thought }
          : state.agents[id],
      },
    })),

  addMessage: (agentId, message) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: state.agents[agentId]
          ? {
              ...state.agents[agentId],
              messages: [...state.agents[agentId].messages, message],
            }
          : state.agents[agentId],
      },
    })),

  addToolCall: (agentId, toolCall) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: state.agents[agentId]
          ? {
              ...state.agents[agentId],
              toolCalls: [...state.agents[agentId].toolCalls, toolCall],
            }
          : state.agents[agentId],
      },
    })),

  updateToolCall: (agentId, toolCallId, updates) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: state.agents[agentId]
          ? {
              ...state.agents[agentId],
              toolCalls: state.agents[agentId].toolCalls.map((tc) =>
                tc.id === toolCallId ? { ...tc, ...updates } : tc
              ),
            }
          : state.agents[agentId],
      },
    })),

  addArtifact: (agentId, artifact) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: state.agents[agentId]
          ? {
              ...state.agents[agentId],
              artifacts: [...state.agents[agentId].artifacts, artifact],
            }
          : state.agents[agentId],
      },
    })),

  addConnection: (connection) =>
    set((state) => ({
      connections: [...state.connections, connection],
    })),

  removeConnection: (id) =>
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
    })),

  setConnectionActive: (id, active) =>
    set((state) => ({
      connections: state.connections.map((c) =>
        c.id === id ? { ...c, active } : c
      ),
    })),

  selectAgent: (id) => set({ selectedAgentId: id }),
  selectArtifact: (id) => set({ selectedArtifactId: id }),
}));
