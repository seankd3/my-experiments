import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Message } from '../protocol/types';

interface Props {
  messages: Message[];
  agentPosition: [number, number, number];
  agentId: string;
}

// Renders recent messages as floating cards arranged in an arc behind the agent
export function ConversationStream({ messages, agentPosition }: Props) {
  const recent = messages.slice(-8);

  return (
    <group position={agentPosition}>
      {recent.map((msg, i) => (
        <MessageCard
          key={msg.id}
          message={msg}
          index={i}
          total={recent.length}
        />
      ))}
    </group>
  );
}

function MessageCard({ message, index, total }: {
  message: Message;
  index: number;
  total: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);

  // Arrange in an arc behind and above the agent
  const angle = ((index - total / 2) * 0.3) - Math.PI;
  const radius = 3;
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;
  const y = 1.5 + index * 0.4;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    // Gentle float
    groupRef.current.position.y = y + Math.sin(t * 0.5 + index) * 0.05;
  });

  const isUser = message.role === 'user';
  const borderColor = isUser ? '#4488ff' : '#44ff88';
  const bgColor = isUser ? 'rgba(20, 40, 80, 0.9)' : 'rgba(20, 60, 40, 0.9)';

  return (
    <group ref={groupRef} position={[x, y, z]}>
      <Html distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: 6,
          padding: '6px 10px',
          color: 'white',
          fontFamily: 'monospace',
          fontSize: 10,
          width: 200,
          maxHeight: 60,
          overflow: 'hidden',
          opacity: 0.6 + (index / total) * 0.4,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{ fontSize: 8, color: borderColor, marginBottom: 2 }}>
            {message.role.toUpperCase()}
          </div>
          {message.content.slice(0, 120)}
          {message.content.length > 120 ? '...' : ''}
        </div>
      </Html>
    </group>
  );
}
