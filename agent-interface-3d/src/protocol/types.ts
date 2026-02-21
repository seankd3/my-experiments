// Agent Protocol — defines how any AI agent integrates with the 3D interface

export type AgentStatus = 'idle' | 'thinking' | 'acting' | 'streaming' | 'error';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export type AgentEvent =
  | { type: 'thinking'; content: string }
  | { type: 'message'; content: string; role: 'assistant' }
  | { type: 'tool_call'; tool: string; input: unknown; id: string }
  | { type: 'tool_result'; id: string; output: unknown; success: boolean }
  | { type: 'artifact'; kind: string; title: string; content: string }
  | { type: 'error'; message: string }
  | { type: 'status_change'; status: AgentStatus }
  | { type: 'done' };

export interface ToolCall {
  id: string;
  tool: string;
  input: unknown;
  output?: unknown;
  status: 'running' | 'success' | 'error';
  startTime: number;
  endTime?: number;
}

export interface Artifact {
  id: string;
  kind: 'code' | 'document' | 'image' | 'data';
  title: string;
  content: string;
  language?: string;
  sourceAgentId: string;
  position?: [number, number, number];
}

export interface AgentNode {
  id: string;
  name: string;
  type: string; // 'claude', 'gpt', 'custom', etc.
  status: AgentStatus;
  position: [number, number, number];
  messages: Message[];
  toolCalls: ToolCall[];
  artifacts: Artifact[];
  currentThought?: string;
}

export interface DataflowConnection {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  label?: string;
  active: boolean;
  dataPreview?: string;
}

export interface AgentAdapter {
  id: string;
  name: string;
  type: string;

  getStatus(): AgentStatus;
  send(content: string): void;
  cancel(): void;
  onEvent(handler: (event: AgentEvent) => void): () => void;
}
