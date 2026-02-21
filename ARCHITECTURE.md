# Agent Interface 3D — Architecture

## Vision
A 3D spatial environment for interacting with AI agents at higher bandwidth.
Combines spatial canvas, real-time dashboards, and visual dataflow in an
immersive 3D space.

## Core Concepts

### 1. The Space
A navigable 3D environment where all agent interactions exist as objects in space.
Users orbit, zoom, and fly through their agent workspace.

### 2. Agent Nodes
Each AI agent is a 3D object (glowing polyhedron) with:
- Status indicator (idle, thinking, acting, error)
- Floating info panels showing current activity
- Connection ports for dataflow
- History trail showing past interactions

### 3. Conversation Streams
Messages flow as animated particles along streams between user and agent nodes.
Each message is inspectable — click to expand into a floating panel.

### 4. Tool Call Visualizations
When an agent uses tools (file reads, code execution, web search), these appear as
subsidiary nodes that spawn from the agent, execute visually, and return results.

### 5. Artifact Space
Code, documents, and other outputs exist as floating panels/objects that can be
arranged in 3D space, connected to their source conversations.

### 6. Dataflow Graph
Agents can be wired together — output of one feeds input of another.
Data flows as visible particle streams along connection tubes.

## Tech Stack
- **React 18** + **TypeScript** — UI foundation
- **Vite** — Build tool
- **React Three Fiber (R3F)** — React renderer for Three.js
- **@react-three/drei** — Useful R3F helpers (OrbitControls, Text, Html, etc.)
- **@react-three/postprocessing** — Visual effects (bloom, glow)
- **Zustand** — State management
- **Anthropic SDK** — Claude API integration (first agent adapter)

## Project Structure
```
src/
├── main.tsx                  # Entry point
├── App.tsx                   # Root component with Canvas
├── store/                    # Zustand state management
│   ├── agentStore.ts         # Agent state
│   ├── sceneStore.ts         # 3D scene state
│   └── flowStore.ts          # Dataflow connections
├── components/
│   ├── Environment.tsx       # 3D scene setup (lights, grid, sky)
│   ├── AgentNode.tsx         # 3D agent representation
│   ├── ConversationStream.tsx # Message flow visualization
│   ├── ToolCallNode.tsx      # Tool execution visualization
│   ├── DataflowEdge.tsx      # Connection between agents
│   ├── FloatingPanel.tsx     # 2D UI panels in 3D space
│   ├── ArtifactObject.tsx    # Code/document artifacts
│   └── HUD.tsx               # Heads-up display overlay
├── protocol/
│   ├── types.ts              # Agent protocol type definitions
│   ├── AgentAdapter.ts       # Abstract adapter interface
│   └── MockClaudeAdapter.ts  # Simulated Claude agent
└── utils/
    ├── layout.ts             # Auto-layout algorithms
    └── animation.ts          # Shared animation utilities
```

## Agent Protocol
```typescript
interface AgentAdapter {
  id: string;
  name: string;
  status: AgentStatus;

  // Core interaction
  send(message: Message): AsyncIterable<AgentEvent>;
  cancel(): void;

  // Events stream
  onEvent: (handler: (event: AgentEvent) => void) => void;
}

type AgentEvent =
  | { type: 'thinking'; content: string }
  | { type: 'message'; content: string; role: 'assistant' }
  | { type: 'tool_call'; tool: string; input: unknown; id: string }
  | { type: 'tool_result'; id: string; output: unknown }
  | { type: 'artifact'; kind: string; content: string }
  | { type: 'error'; message: string }
  | { type: 'status_change'; status: AgentStatus }
  | { type: 'done' };
```
