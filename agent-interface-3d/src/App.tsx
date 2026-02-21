import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Environment } from './components/Environment';
import { AgentNode3D } from './components/AgentNode';
import { DataflowEdge } from './components/DataflowEdge';
import { ConversationStream } from './components/ConversationStream';
import { ArtifactObject } from './components/ArtifactObject';
import { HUD } from './components/HUD';
import { useAgentStore } from './store/agentStore';

function Scene() {
  const agents = useAgentStore((s) => s.agents);
  const connections = useAgentStore((s) => s.connections);
  const selectAgent = useAgentStore((s) => s.selectAgent);

  const agentList = Object.values(agents);

  return (
    <>
      <Environment />
      <OrbitControls
        makeDefault
        maxPolarAngle={Math.PI / 2.1}
        minDistance={2}
        maxDistance={50}
        enableDamping
        dampingFactor={0.05}
      />

      {/* Click on empty space to deselect */}
      <mesh
        position={[0, -0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={() => selectAgent(null)}
        visible={false}
      >
        <planeGeometry args={[200, 200]} />
      </mesh>

      {/* Agent nodes */}
      {agentList.map((agent) => (
        <AgentNode3D key={agent.id} agent={agent} />
      ))}

      {/* Dataflow connections */}
      {connections.map((conn) => (
        <DataflowEdge key={conn.id} connection={conn} />
      ))}

      {/* Conversation streams */}
      {agentList.map((agent) =>
        agent.messages.length > 0 ? (
          <ConversationStream
            key={`conv-${agent.id}`}
            messages={agent.messages}
            agentPosition={agent.position}
            agentId={agent.id}
          />
        ) : null
      )}

      {/* Artifacts */}
      {agentList.flatMap((agent) =>
        agent.artifacts.map((artifact, i) => (
          <ArtifactObject
            key={artifact.id}
            artifact={artifact}
            position={[
              agent.position[0] + 2.5 + i * 1.2,
              agent.position[1] + 1,
              agent.position[2] - 1,
            ]}
          />
        ))
      )}

      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.4}
          luminanceSmoothing={0.9}
          intensity={0.8}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050a14' }}>
      <Canvas
        camera={{ position: [8, 6, 8], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>
      <HUD />
    </div>
  );
}
