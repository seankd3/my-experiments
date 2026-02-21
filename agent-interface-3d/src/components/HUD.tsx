import { useState, useCallback } from 'react';
import { useAgentStore } from '../store/agentStore';
import { MockClaudeAdapter } from '../protocol/MockClaudeAdapter';
import type { AgentEvent, AgentNode } from '../protocol/types';

// Heads-Up Display: 2D overlay with controls and agent management
export function HUD() {
  const agents = useAgentStore((s) => s.agents);
  const connections = useAgentStore((s) => s.connections);
  const selectedAgentId = useAgentStore((s) => s.selectedAgentId);
  const addAgent = useAgentStore((s) => s.addAgent);
  const addConnection = useAgentStore((s) => s.addConnection);
  const addMessage = useAgentStore((s) => s.addMessage);
  const addToolCall = useAgentStore((s) => s.addToolCall);
  const updateToolCall = useAgentStore((s) => s.updateToolCall);
  const updateAgentStatus = useAgentStore((s) => s.updateAgentStatus);
  const setAgentThought = useAgentStore((s) => s.setAgentThought);
  const addArtifact = useAgentStore((s) => s.addArtifact);
  const [input, setInput] = useState('');
  const [adapters] = useState<Record<string, MockClaudeAdapter>>({});

  const agentList = Object.values(agents);

  const spawnAgent = useCallback(() => {
    const id = `agent_${Date.now()}`;
    const count = agentList.length;
    // Arrange in a circle
    const angle = (count * Math.PI * 2) / Math.max(count + 1, 3);
    const radius = 4;

    const agent: AgentNode = {
      id,
      name: `Claude ${count + 1}`,
      type: 'claude',
      status: 'idle',
      position: [
        Math.cos(angle) * radius,
        0.5,
        Math.sin(angle) * radius,
      ],
      messages: [],
      toolCalls: [],
      artifacts: [],
    };

    addAgent(agent);

    // Create mock adapter
    const adapter = new MockClaudeAdapter(id);
    adapters[id] = adapter;

    // Wire up events
    adapter.onEvent((event: AgentEvent) => {
      switch (event.type) {
        case 'status_change':
          updateAgentStatus(id, event.status);
          break;
        case 'thinking':
          setAgentThought(id, event.content);
          break;
        case 'tool_call':
          addToolCall(id, {
            id: event.id,
            tool: event.tool,
            input: event.input,
            status: 'running',
            startTime: Date.now(),
          });
          break;
        case 'tool_result':
          updateToolCall(id, event.id, {
            output: event.output,
            status: event.success ? 'success' : 'error',
            endTime: Date.now(),
          });
          break;
        case 'message':
          // Update last message (streaming)
          break;
        case 'artifact':
          addArtifact(id, {
            id: `artifact_${Date.now()}`,
            kind: event.kind as 'code' | 'document' | 'image' | 'data',
            title: event.title,
            content: event.content,
            sourceAgentId: id,
          });
          break;
        case 'done':
          setAgentThought(id, undefined);
          break;
      }
    });

    // Auto-connect to existing agents
    if (count > 0) {
      const lastAgent = agentList[count - 1];
      addConnection({
        id: `conn_${Date.now()}`,
        sourceAgentId: lastAgent.id,
        targetAgentId: id,
        active: false,
      });
    }
  }, [agentList, adapters, addAgent, addConnection, addToolCall, updateToolCall, updateAgentStatus, setAgentThought, addArtifact]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || !selectedAgentId) return;

    addMessage(selectedAgentId, {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    });

    const adapter = adapters[selectedAgentId];
    if (adapter) {
      adapter.send(input).then(() => {
        addMessage(selectedAgentId!, {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: 'Response completed.',
          timestamp: Date.now(),
        });
      });
    }

    setInput('');
  }, [input, selectedAgentId, adapters, addMessage]);

  const selectedAgent = selectedAgentId ? agents[selectedAgentId] : null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      zIndex: 10,
    }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(5,10,20,0.8), transparent)',
      }}>
        <div style={{ color: '#4488ff', fontSize: 14, fontWeight: 'bold', pointerEvents: 'auto' }}>
          AGENT INTERFACE 3D
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: '#666', fontSize: 11 }}>
            {agentList.length} agent{agentList.length !== 1 ? 's' : ''} |{' '}
            {connections.length} connection{connections.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={spawnAgent}
            style={{
              pointerEvents: 'auto',
              padding: '6px 16px',
              background: 'rgba(68, 136, 255, 0.2)',
              border: '1px solid #4488ff',
              borderRadius: 4,
              color: '#4488ff',
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'inherit',
            }}
          >
            + SPAWN AGENT
          </button>
        </div>
      </div>

      {/* Agent status bar (left side) */}
      <div style={{
        position: 'absolute',
        left: 16,
        top: 60,
        pointerEvents: 'auto',
      }}>
        {agentList.map((agent) => (
          <div
            key={agent.id}
            style={{
              padding: '6px 10px',
              marginBottom: 4,
              background: selectedAgentId === agent.id
                ? 'rgba(68, 136, 255, 0.2)'
                : 'rgba(10, 15, 30, 0.6)',
              border: `1px solid ${
                agent.status === 'idle' ? '#334' :
                agent.status === 'thinking' ? '#ffaa22' :
                agent.status === 'acting' ? '#44ff88' : '#4488ff'
              }`,
              borderRadius: 4,
              color: 'white',
              fontSize: 10,
              cursor: 'pointer',
              minWidth: 140,
            }}
            onClick={() => useAgentStore.getState().selectAgent(agent.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{agent.name}</span>
              <span style={{
                color: agent.status === 'idle' ? '#4488ff' :
                  agent.status === 'thinking' ? '#ffaa22' :
                  agent.status === 'acting' ? '#44ff88' : '#aa44ff',
                fontSize: 9,
              }}>
                {agent.status.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Input bar (bottom) */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
        display: 'flex',
        gap: 8,
        width: 'min(600px, 80vw)',
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={selectedAgent
            ? `Message ${selectedAgent.name}...`
            : 'Select an agent first...'}
          disabled={!selectedAgentId}
          style={{
            flex: 1,
            padding: '10px 16px',
            background: 'rgba(10, 15, 30, 0.9)',
            border: `1px solid ${selectedAgentId ? '#4488ff' : '#333'}`,
            borderRadius: 6,
            color: 'white',
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
            backdropFilter: 'blur(10px)',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!selectedAgentId || !input.trim()}
          style={{
            padding: '10px 20px',
            background: selectedAgentId && input.trim()
              ? 'rgba(68, 136, 255, 0.3)'
              : 'rgba(30, 30, 50, 0.5)',
            border: `1px solid ${selectedAgentId && input.trim() ? '#4488ff' : '#333'}`,
            borderRadius: 6,
            color: selectedAgentId && input.trim() ? '#4488ff' : '#555',
            cursor: selectedAgentId && input.trim() ? 'pointer' : 'default',
            fontSize: 12,
            fontFamily: 'inherit',
          }}
        >
          SEND
        </button>
      </div>

      {/* Help text */}
      <div style={{
        position: 'absolute',
        bottom: 64,
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#445',
        fontSize: 10,
        textAlign: 'center',
      }}>
        Orbit: Left-click drag | Zoom: Scroll | Pan: Right-click drag
      </div>
    </div>
  );
}
