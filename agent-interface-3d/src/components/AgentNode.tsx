import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Html, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { AgentNode as AgentNodeType, AgentStatus } from '../protocol/types';
import { useAgentStore } from '../store/agentStore';

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: '#4488ff',
  thinking: '#ffaa22',
  acting: '#44ff88',
  streaming: '#aa44ff',
  error: '#ff4444',
};

const STATUS_EMISSIVE: Record<AgentStatus, number> = {
  idle: 0.2,
  thinking: 0.8,
  acting: 0.6,
  streaming: 0.5,
  error: 1.0,
};

interface Props {
  agent: AgentNodeType;
}

export function AgentNode3D({ agent }: Props) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const selectedId = useAgentStore((s) => s.selectedAgentId);
  const selectAgent = useAgentStore((s) => s.selectAgent);
  const isSelected = selectedId === agent.id;
  const [hovered, setHovered] = useState(false);

  const color = STATUS_COLORS[agent.status];
  const emissiveIntensity = STATUS_EMISSIVE[agent.status];

  // Animate based on status
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    // Gentle rotation
    meshRef.current.rotation.y = t * 0.3;
    meshRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;

    // Pulse when thinking
    if (agent.status === 'thinking') {
      const pulse = 1 + Math.sin(t * 3) * 0.1;
      meshRef.current.scale.setScalar(pulse);
    } else if (agent.status === 'acting') {
      const pulse = 1 + Math.sin(t * 5) * 0.05;
      meshRef.current.scale.setScalar(pulse);
    } else {
      meshRef.current.scale.setScalar(1);
    }

    // Glow ring animation
    if (glowRef.current) {
      glowRef.current.rotation.z = t * 0.5;
      const glowScale = isSelected ? 1.8 : hovered ? 1.6 : 1.4;
      glowRef.current.scale.setScalar(glowScale + Math.sin(t * 2) * 0.05);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectAgent(isSelected ? null : agent.id);
  };

  const recentToolCalls = agent.toolCalls.slice(-3);
  const lastMessage = agent.messages[agent.messages.length - 1];

  return (
    <group position={agent.position}>
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
        {/* Main agent polyhedron */}
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <icosahedronGeometry args={[0.6, 1]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={emissiveIntensity}
            metalness={0.3}
            roughness={0.4}
            wireframe={agent.status === 'thinking'}
          />
        </mesh>

        {/* Selection / hover ring */}
        <mesh ref={glowRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.9, 0.02, 8, 64]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={isSelected ? 0.8 : hovered ? 0.5 : 0.2}
          />
        </mesh>

        {/* Agent name label */}
        <Text
          position={[0, 1.2, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="black"
        >
          {agent.name}
        </Text>

        {/* Status label */}
        <Text
          position={[0, 0.95, 0]}
          fontSize={0.12}
          color={color}
          anchorX="center"
          anchorY="bottom"
        >
          {agent.status.toUpperCase()}
        </Text>

        {/* Point light that reflects agent status */}
        <pointLight color={color} intensity={emissiveIntensity * 2} distance={5} />
      </Float>

      {/* HTML overlay for detailed info (only when selected or hovered) */}
      {(isSelected || hovered) && (
        <Html
          position={[1.5, 0.5, 0]}
          distanceFactor={8}
          style={{ pointerEvents: isSelected ? 'auto' : 'none' }}
        >
          <div style={{
            background: 'rgba(10, 15, 30, 0.92)',
            border: `1px solid ${color}`,
            borderRadius: 8,
            padding: 12,
            color: 'white',
            fontFamily: 'monospace',
            fontSize: 11,
            width: 280,
            maxHeight: 300,
            overflow: 'auto',
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: 6, color }}>
              {agent.name} — {agent.type}
            </div>

            {/* Current thought */}
            {agent.currentThought && (
              <div style={{
                padding: 6,
                background: 'rgba(255,170,34,0.1)',
                borderLeft: '2px solid #ffaa22',
                marginBottom: 6,
                fontSize: 10,
              }}>
                {agent.currentThought}
              </div>
            )}

            {/* Recent tool calls */}
            {recentToolCalls.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ color: '#888', fontSize: 9, marginBottom: 2 }}>TOOL CALLS</div>
                {recentToolCalls.map((tc) => (
                  <div key={tc.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 10,
                    padding: '2px 0',
                  }}>
                    <span style={{
                      color: tc.status === 'running' ? '#ffaa22'
                        : tc.status === 'success' ? '#44ff88' : '#ff4444',
                    }}>
                      {tc.status === 'running' ? '⟳' : tc.status === 'success' ? '✓' : '✗'}
                    </span>
                    <span style={{ color: '#88aaff' }}>{tc.tool}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Last message preview */}
            {lastMessage && (
              <div style={{
                fontSize: 10,
                color: '#aaa',
                borderTop: '1px solid #333',
                paddingTop: 6,
                maxHeight: 80,
                overflow: 'hidden',
              }}>
                {lastMessage.content.slice(0, 150)}
                {lastMessage.content.length > 150 ? '...' : ''}
              </div>
            )}

            {/* Stats */}
            <div style={{
              display: 'flex',
              gap: 12,
              fontSize: 9,
              color: '#666',
              marginTop: 6,
              borderTop: '1px solid #222',
              paddingTop: 4,
            }}>
              <span>{agent.messages.length} msgs</span>
              <span>{agent.toolCalls.length} tools</span>
              <span>{agent.artifacts.length} artifacts</span>
            </div>
          </div>
        </Html>
      )}

      {/* Tool call orbital nodes */}
      {agent.toolCalls
        .filter((tc) => tc.status === 'running')
        .map((tc, i) => (
          <ToolCallOrbit key={tc.id} toolCall={tc} index={i} parentColor={color} />
        ))}
    </group>
  );
}

function ToolCallOrbit({ toolCall, index, parentColor }: {
  toolCall: AgentNodeType['toolCalls'][0];
  index: number;
  parentColor: string;
}) {
  const ref = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const angle = t * 2 + index * (Math.PI * 2 / 3);
    const radius = 1.5;
    ref.current.position.set(
      Math.cos(angle) * radius,
      0.5 + Math.sin(t * 3) * 0.2,
      Math.sin(angle) * radius
    );
  });

  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[0.15, 0.15, 0.15]} />
        <meshStandardMaterial
          color="#44ff88"
          emissive="#44ff88"
          emissiveIntensity={0.5}
        />
      </mesh>
      <Text
        position={[0, 0.2, 0]}
        fontSize={0.08}
        color="white"
        anchorX="center"
      >
        {toolCall.tool}
      </Text>
    </group>
  );
}
