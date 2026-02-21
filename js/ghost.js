/**
 * GhostOverlay — proposed change visualization system.
 *
 * When Claude proposes a change, the new structure appears as translucent
 * "ghost" geometry overlapping the existing. You see both the present and
 * the proposed future simultaneously.
 *
 * - Ghost objects are semi-transparent with a distinct visual treatment
 * - Lines connecting to ghost objects glow differently (yellow = needs adapter, green = clean break)
 * - You can push/gesture to accept or dismiss
 */
class GhostOverlay {
  constructor(scene) {
    this.scene = scene;
    this.ghostObjects = new Map();
    this.proposals = [];
  }

  /**
   * Create a ghost proposal — a set of objects showing what WOULD happen.
   * Returns a proposal handle.
   */
  propose(commands) {
    const proposal = {
      id: `proposal_${Date.now()}`,
      objects: [],
      state: 'visible', // visible | accepted | rejected
    };

    for (const cmd of commands) {
      if (cmd.type !== 'create') continue;

      const color = new THREE.Color(cmd.color || '#44ffaa');
      const mat = new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      let geom;
      switch (cmd.geometry || 'box') {
        case 'sphere': geom = new THREE.SphereGeometry(cmd.radius || 1, 16, 16); break;
        case 'box': geom = new THREE.BoxGeometry(cmd.width || 1, cmd.height || 1, cmd.depth || 1); break;
        case 'cylinder': geom = new THREE.CylinderGeometry(cmd.radiusTop || 0.5, cmd.radiusBottom || 0.5, cmd.height || 1, 12); break;
        case 'torus': geom = new THREE.TorusGeometry(cmd.radius || 1, cmd.tube || 0.3, 12, 24); break;
        default: geom = new THREE.BoxGeometry(1, 1, 1);
      }

      const mesh = new THREE.Mesh(geom, mat);
      if (cmd.position) mesh.position.set(...cmd.position);
      if (cmd.scale) {
        if (Array.isArray(cmd.scale)) mesh.scale.set(...cmd.scale);
        else mesh.scale.setScalar(cmd.scale);
      }

      mesh.userData.ghostId = cmd.id;
      mesh.userData.proposalId = proposal.id;
      mesh.userData.originalCmd = cmd;
      this.scene.add(mesh);
      proposal.objects.push(mesh);
      this.ghostObjects.set(cmd.id, mesh);
    }

    this.proposals.push(proposal);
    return proposal;
  }

  /**
   * Accept a proposal — ghost objects solidify into real objects.
   * Returns the commands to execute via SceneCommander.
   */
  accept(proposalId) {
    const proposal = this.proposals.find(p => p.id === proposalId);
    if (!proposal) return [];

    proposal.state = 'accepted';
    const commands = [];

    for (const ghost of proposal.objects) {
      // Solidify animation
      ghost.material.opacity = 0.7;
      ghost.material.blending = THREE.NormalBlending;

      // Collect the original create commands
      if (ghost.userData.originalCmd) {
        commands.push(ghost.userData.originalCmd);
      }

      // Remove ghost after a beat
      setTimeout(() => {
        this.scene.remove(ghost);
        ghost.geometry.dispose();
        ghost.material.dispose();
        this.ghostObjects.delete(ghost.userData.ghostId);
      }, 500);
    }

    this.proposals = this.proposals.filter(p => p.id !== proposalId);
    return commands;
  }

  /**
   * Reject a proposal — ghost objects dissolve.
   */
  reject(proposalId) {
    const proposal = this.proposals.find(p => p.id === proposalId);
    if (!proposal) return;

    proposal.state = 'rejected';

    for (const ghost of proposal.objects) {
      // Dissolve animation
      const startOpacity = ghost.material.opacity;
      const startTime = performance.now();
      const dissolve = () => {
        const t = (performance.now() - startTime) / 600;
        if (t >= 1) {
          this.scene.remove(ghost);
          ghost.geometry.dispose();
          ghost.material.dispose();
          this.ghostObjects.delete(ghost.userData.ghostId);
          return;
        }
        ghost.material.opacity = startOpacity * (1 - t);
        ghost.scale.multiplyScalar(0.98);
        requestAnimationFrame(dissolve);
      };
      dissolve();
    }

    this.proposals = this.proposals.filter(p => p.id !== proposalId);
  }

  update(dt) {
    const now = performance.now();

    // Gentle breathing/shimmer on ghost objects
    for (const [, ghost] of this.ghostObjects) {
      if (ghost.material) {
        ghost.material.opacity = 0.15 + Math.sin(now * 0.003) * 0.1;
      }
      // Slow rotation to distinguish from solid objects
      ghost.rotation.y += dt * 0.2;
    }
  }

  /** Get the active proposal (if any) */
  get activeProposal() {
    return this.proposals.find(p => p.state === 'visible') || null;
  }
}

window.GhostOverlay = GhostOverlay;
