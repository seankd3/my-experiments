/**
 * AgentSystem — visual representation of Claude's background agents.
 *
 * When you say "send agents to fix those", sparks of light detach and streak
 * toward targets. Each agent has a lifecycle:
 *   dispatched -> traveling -> working -> completed
 *
 * Visually:
 *   - A bright spark detaches from your hand position
 *   - It streaks toward the target, leaving a fading trail
 *   - At the target, it orbits and pulses while "working"
 *   - On completion, it flashes and dissolves
 */
class AgentSystem {
  constructor(scene, audio) {
    this.scene = scene;
    this.audio = audio;
    this.agents = [];
    this.trailMaterial = new THREE.PointsMaterial({
      size: 0.08,
      color: 0xaaccff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  /**
   * Dispatch an agent from origin to target.
   * Returns an agent handle for status updates.
   */
  dispatch(origin, target, options = {}) {
    const agent = {
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      state: 'traveling',
      origin: origin.clone(),
      target: target.clone(),
      position: origin.clone(),
      progress: 0,
      speed: options.speed || 8,
      color: new THREE.Color(options.color || '#aaccff'),
      label: options.label || '',
      workDuration: options.workDuration || 3000,
      workStartTime: 0,
      trail: [],
      mesh: null,
      trailPoints: null,
      orbitAngle: 0,
    };

    // Create the spark mesh
    const sparkGeom = new THREE.SphereGeometry(0.1, 8, 8);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: agent.color,
      transparent: true,
      opacity: 0.9,
    });
    agent.mesh = new THREE.Mesh(sparkGeom, sparkMat);
    agent.mesh.position.copy(origin);
    this.scene.add(agent.mesh);

    // Create glow
    const glowGeom = new THREE.SphereGeometry(0.25, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: agent.color,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    agent.glow = new THREE.Mesh(glowGeom, glowMat);
    agent.mesh.add(agent.glow);

    // Trail
    const trailGeom = new THREE.BufferGeometry();
    const maxTrailPoints = 50;
    const trailPositions = new Float32Array(maxTrailPoints * 3);
    trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeom.setDrawRange(0, 0);
    agent.trailPoints = new THREE.Points(trailGeom, this.trailMaterial.clone());
    this.scene.add(agent.trailPoints);
    agent.maxTrailPoints = maxTrailPoints;
    agent.trailIndex = 0;

    this.agents.push(agent);

    // Sound
    this.audio.agentDispatch();

    return agent;
  }

  /**
   * Mark an agent as completed. Triggers the completion flash.
   */
  complete(agentId) {
    const agent = this.agents.find(a => a.id === agentId);
    if (agent) {
      agent.state = 'completing';
      agent.completeTime = performance.now();
      this.audio.chime(440, 1.0);
    }
  }

  update(dt) {
    const now = performance.now();

    for (let i = this.agents.length - 1; i >= 0; i--) {
      const agent = this.agents[i];

      if (agent.state === 'traveling') {
        // Move toward target
        const dir = agent.target.clone().sub(agent.position);
        const dist = dir.length();
        if (dist < 0.3) {
          agent.state = 'working';
          agent.workStartTime = now;
          agent.position.copy(agent.target);
        } else {
          dir.normalize().multiplyScalar(agent.speed * dt);
          agent.position.add(dir);

          // Add wobble
          agent.position.x += Math.sin(now * 0.01 + agent.position.z) * 0.02;
          agent.position.y += Math.cos(now * 0.013) * 0.01;
        }

        // Update trail
        this._updateTrail(agent);
      }

      else if (agent.state === 'working') {
        // Orbit around target
        agent.orbitAngle += dt * 3;
        const orbitRadius = 0.5;
        agent.position.x = agent.target.x + Math.cos(agent.orbitAngle) * orbitRadius;
        agent.position.y = agent.target.y + Math.sin(agent.orbitAngle * 0.7) * 0.3;
        agent.position.z = agent.target.z + Math.sin(agent.orbitAngle) * orbitRadius;

        // Pulse glow
        if (agent.glow) {
          agent.glow.material.opacity = 0.2 + Math.sin(now * 0.005) * 0.15;
        }

        // Auto-complete after work duration
        if (now - agent.workStartTime > agent.workDuration) {
          agent.state = 'completing';
          agent.completeTime = now;
          this.audio.chime(660, 0.8);
        }
      }

      else if (agent.state === 'completing') {
        // Flash and dissolve
        const elapsed = now - agent.completeTime;
        const t = elapsed / 800; // 800ms dissolve

        if (agent.mesh) {
          agent.mesh.material.opacity = Math.max(0, 1 - t);
          agent.mesh.scale.setScalar(1 + t * 2);
        }
        if (agent.glow) {
          agent.glow.material.opacity = Math.max(0, 0.5 * (1 - t));
        }

        if (t >= 1) {
          // Remove
          this.scene.remove(agent.mesh);
          this.scene.remove(agent.trailPoints);
          if (agent.mesh.geometry) agent.mesh.geometry.dispose();
          if (agent.mesh.material) agent.mesh.material.dispose();
          if (agent.trailPoints.geometry) agent.trailPoints.geometry.dispose();
          this.agents.splice(i, 1);
          continue;
        }
      }

      // Update mesh position
      if (agent.mesh) {
        agent.mesh.position.copy(agent.position);
      }
    }
  }

  _updateTrail(agent) {
    const positions = agent.trailPoints.geometry.attributes.position;
    const idx = agent.trailIndex % agent.maxTrailPoints;
    positions.setXYZ(idx, agent.position.x, agent.position.y, agent.position.z);
    positions.needsUpdate = true;
    agent.trailIndex++;
    agent.trailPoints.geometry.setDrawRange(0, Math.min(agent.trailIndex, agent.maxTrailPoints));
  }

  /** Get active agent count */
  get activeCount() {
    return this.agents.filter(a => a.state !== 'completing').length;
  }
}

window.AgentSystem = AgentSystem;
