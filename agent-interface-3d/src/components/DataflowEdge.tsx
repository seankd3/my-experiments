import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DataflowConnection } from '../protocol/types';
import { useAgentStore } from '../store/agentStore';

interface Props {
  connection: DataflowConnection;
}

// Visualizes data flowing between two agents as a tube with animated particles
export function DataflowEdge({ connection }: Props) {
  const agents = useAgentStore((s) => s.agents);
  const source = agents[connection.sourceAgentId];
  const target = agents[connection.targetAgentId];

  if (!source || !target) return null;

  return (
    <group>
      <ConnectionTube
        start={source.position}
        end={target.position}
        active={connection.active}
      />
      {connection.active && (
        <FlowParticles
          start={source.position}
          end={target.position}
        />
      )}
    </group>
  );
}

function ConnectionTube({ start, end, active }: {
  start: [number, number, number];
  end: [number, number, number];
  active: boolean;
}) {
  const curve = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const mid = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
    mid.y += 2; // Arc upward
    return new THREE.QuadraticBezierCurve3(s, mid, e);
  }, [start[0], start[1], start[2], end[0], end[1], end[2]]);

  const tubeGeo = useMemo(
    () => new THREE.TubeGeometry(curve, 32, 0.03, 8, false),
    [curve]
  );

  return (
    <mesh geometry={tubeGeo}>
      <meshBasicMaterial
        color={active ? '#4488ff' : '#223355'}
        transparent
        opacity={active ? 0.6 : 0.2}
      />
    </mesh>
  );
}

function FlowParticles({ start, end }: {
  start: [number, number, number];
  end: [number, number, number];
}) {
  const count = 12;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useRef(new THREE.Object3D());

  const curve = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const mid = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
    mid.y += 2;
    return new THREE.QuadraticBezierCurve3(s, mid, e);
  }, [start[0], start[1], start[2], end[0], end[1], end[2]]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const progress = ((t * 0.3 + i / count) % 1);
      const point = curve.getPoint(progress);
      dummy.current.position.copy(point);
      dummy.current.scale.setScalar(0.03 + Math.sin(progress * Math.PI) * 0.02);
      dummy.current.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.current.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#66aaff" transparent opacity={0.8} />
    </instancedMesh>
  );
}
