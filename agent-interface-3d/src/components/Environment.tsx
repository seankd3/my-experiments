import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Grid, Stars, Float } from '@react-three/drei';
import * as THREE from 'three';

// The 3D environment: infinite grid, stars, ambient atmosphere
export function Environment() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 20, 10]} intensity={0.5} color="#e0e8ff" />
      <pointLight position={[-10, 10, -10]} intensity={0.3} color="#4060ff" />
      <pointLight position={[10, -5, 10]} intensity={0.2} color="#ff4060" />

      {/* Ground grid */}
      <Grid
        position={[0, -0.01, 0]}
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a2040"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2a3060"
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid
      />

      {/* Starfield background */}
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0.5} fade speed={1} />

      {/* Floating ambient particles */}
      <AmbientParticles />
    </>
  );
}

function AmbientParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const count = 200;
  const dummy = useRef(new THREE.Object3D());
  const particleData = useRef<{ pos: THREE.Vector3; speed: number; phase: number }[]>([]);

  // Initialize particle positions
  if (particleData.current.length === 0) {
    for (let i = 0; i < count; i++) {
      particleData.current.push({
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * 60,
          Math.random() * 20 + 1,
          (Math.random() - 0.5) * 60
        ),
        speed: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    particleData.current.forEach((p, i) => {
      dummy.current.position.set(
        p.pos.x + Math.sin(t * p.speed + p.phase) * 0.5,
        p.pos.y + Math.sin(t * p.speed * 0.7 + p.phase) * 0.3,
        p.pos.z + Math.cos(t * p.speed + p.phase) * 0.5
      );
      dummy.current.scale.setScalar(0.02 + Math.sin(t * 2 + p.phase) * 0.01);
      dummy.current.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.current.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#4488ff" transparent opacity={0.4} />
    </instancedMesh>
  );
}
