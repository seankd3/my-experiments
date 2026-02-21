import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Artifact } from '../protocol/types';
import { useAgentStore } from '../store/agentStore';

interface Props {
  artifact: Artifact;
  position: [number, number, number];
}

const KIND_COLORS: Record<string, string> = {
  code: '#44ff88',
  document: '#4488ff',
  image: '#ff8844',
  data: '#aa44ff',
};

// Artifacts appear as floating translucent panels in 3D space
export function ArtifactObject({ artifact, position }: Props) {
  const groupRef = useRef<THREE.Group>(null!);
  const [expanded, setExpanded] = useState(false);
  const selectedId = useAgentStore((s) => s.selectedArtifactId);
  const selectArtifact = useAgentStore((s) => s.selectArtifact);
  const isSelected = selectedId === artifact.id;

  const color = KIND_COLORS[artifact.kind] || '#4488ff';

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.position.y = position[1] + Math.sin(t * 0.7 + position[0]) * 0.1;
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setExpanded(!expanded);
    selectArtifact(isSelected ? null : artifact.id);
  };

  return (
    <group ref={groupRef} position={position}>
      {/* Artifact icon */}
      <mesh onClick={handleClick}>
        <boxGeometry args={[0.4, 0.5, 0.05]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.5 : 0.2}
          transparent
          opacity={0.7}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* Title */}
      <Text
        position={[0, 0.4, 0]}
        fontSize={0.1}
        color={color}
        anchorX="center"
      >
        {artifact.title}
      </Text>

      <Text
        position={[0, 0.28, 0]}
        fontSize={0.06}
        color="#888"
        anchorX="center"
      >
        {artifact.kind.toUpperCase()}
      </Text>

      {/* Expanded content */}
      {expanded && (
        <Html position={[0.5, 0, 0]} distanceFactor={6}>
          <div style={{
            background: 'rgba(10, 15, 30, 0.95)',
            border: `1px solid ${color}`,
            borderRadius: 8,
            padding: 12,
            color: 'white',
            fontFamily: 'monospace',
            fontSize: 11,
            width: 350,
            maxHeight: 400,
            overflow: 'auto',
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}>
              <span style={{ fontWeight: 'bold', color }}>{artifact.title}</span>
              <span style={{ fontSize: 9, color: '#666' }}>{artifact.kind}</span>
            </div>
            <pre style={{
              margin: 0,
              padding: 8,
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 4,
              fontSize: 10,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {artifact.content}
            </pre>
          </div>
        </Html>
      )}
    </group>
  );
}
