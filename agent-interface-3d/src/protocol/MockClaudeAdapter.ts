import type { AgentAdapter, AgentEvent, AgentStatus } from './types';

// Simulates a Claude-like agent for demo/development purposes
// Produces realistic event sequences: thinking → tool calls → message → done

const MOCK_TOOLS = [
  { tool: 'Read', input: { file_path: '/src/components/App.tsx' } },
  { tool: 'Grep', input: { pattern: 'useState', path: '/src' } },
  { tool: 'Bash', input: { command: 'npm test' } },
  { tool: 'Edit', input: { file_path: '/src/utils/helpers.ts', old_string: 'foo', new_string: 'bar' } },
  { tool: 'WebSearch', input: { query: 'React Three Fiber performance tips' } },
];

const MOCK_THOUGHTS = [
  'Analyzing the code structure to understand the component hierarchy...',
  'Looking at the imports and dependencies to identify the data flow...',
  'Considering the best approach to implement the requested feature...',
  'Checking for existing patterns in the codebase that I can follow...',
  'Planning the changes needed across multiple files...',
];

const MOCK_RESPONSES = [
  "I've analyzed the codebase and found the relevant files. The component uses a standard React pattern with hooks for state management. I'll make the changes to support the new feature.",
  "I've updated the configuration and tested the changes. The build succeeds and all existing tests pass. The new functionality is ready to use.",
  "Here's what I found: the performance issue was caused by unnecessary re-renders in the main component tree. I've applied memoization and the rendering time dropped by 60%.",
];

const MOCK_ARTIFACTS = [
  { kind: 'code' as const, title: 'Updated Component', content: 'export function Agent({ id }: Props) {\n  const [status, setStatus] = useState("idle");\n  return <div className={status}>{id}</div>;\n}', language: 'typescript' },
  { kind: 'document' as const, title: 'Analysis Report', content: '# Performance Analysis\n\n- Render count: reduced from 47 to 12\n- Bundle size: 234KB → 198KB\n- LCP: 1.2s → 0.8s' },
];

export class MockClaudeAdapter implements AgentAdapter {
  id: string;
  name = 'Claude (Mock)';
  type = 'claude';
  private status: AgentStatus = 'idle';
  private handlers: Set<(event: AgentEvent) => void> = new Set();
  private abortController?: AbortController;

  constructor(id: string) {
    this.id = id;
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  private emit(event: AgentEvent) {
    this.handlers.forEach(h => h(event));
  }

  private setStatus(status: AgentStatus) {
    this.status = status;
    this.emit({ type: 'status_change', status });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      this.abortController?.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('cancelled'));
      });
    });
  }

  async send(content: string): Promise<void> {
    this.abortController = new AbortController();

    try {
      // Phase 1: Thinking
      this.setStatus('thinking');
      const thought = MOCK_THOUGHTS[Math.floor(Math.random() * MOCK_THOUGHTS.length)];
      this.emit({ type: 'thinking', content: thought });
      await this.delay(1500 + Math.random() * 1000);

      // Phase 2: Tool calls (1-3 random tools)
      this.setStatus('acting');
      const numTools = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numTools; i++) {
        const mockTool = MOCK_TOOLS[Math.floor(Math.random() * MOCK_TOOLS.length)];
        const toolId = `tool_${Date.now()}_${i}`;
        this.emit({ type: 'tool_call', tool: mockTool.tool, input: mockTool.input, id: toolId });
        await this.delay(800 + Math.random() * 1200);
        this.emit({ type: 'tool_result', id: toolId, output: `Result from ${mockTool.tool}`, success: true });
        await this.delay(300);
      }

      // Phase 3: Generate response
      this.setStatus('streaming');
      const response = content.toLowerCase().includes('error')
        ? MOCK_RESPONSES[2]
        : MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];

      // Stream word by word
      const words = response.split(' ');
      let accumulated = '';
      for (const word of words) {
        accumulated += (accumulated ? ' ' : '') + word;
        this.emit({ type: 'message', content: accumulated, role: 'assistant' });
        await this.delay(30 + Math.random() * 50);
      }

      // Phase 4: Maybe produce an artifact
      if (Math.random() > 0.5) {
        const artifact = MOCK_ARTIFACTS[Math.floor(Math.random() * MOCK_ARTIFACTS.length)];
        this.emit({ type: 'artifact', ...artifact });
      }

      this.setStatus('idle');
      this.emit({ type: 'done' });
    } catch {
      if (this.abortController?.signal.aborted) {
        this.setStatus('idle');
      }
    }
  }

  cancel(): void {
    this.abortController?.abort();
    this.setStatus('idle');
  }

  onEvent(handler: (event: AgentEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}
