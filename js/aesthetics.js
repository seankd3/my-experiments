/**
 * Aesthetics — the visual soul of the void.
 * Grid pulses, particle fields, ambient glow, fog.
 */
class VoidAesthetics {
  constructor(scene) {
    this.scene = scene;
    this.grid = null;
    this.particles = null;
    this.gridPulses = [];
    this.time = 0;
    this.ambientIntensity = 0;
    this.targetAmbientIntensity = 0;
  }

  init() {
    this._createGrid();
    this._createParticleField();
    this._createAmbientLight();
  }

  _createGrid() {
    // Infinite grid plane that materializes under your feet
    const gridSize = 200;
    const divisions = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const step = gridSize / divisions;
    const half = gridSize / 2;

    for (let i = 0; i <= divisions; i++) {
      const pos = -half + i * step;
      // X-axis lines
      positions.push(-half, 0, pos, half, 0, pos);
      // Z-axis lines
      positions.push(pos, 0, -half, pos, 0, half);
      // Colors — dim blue
      for (let j = 0; j < 4; j++) {
        colors.push(0.1, 0.15, 0.3, 0.0);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.grid = new THREE.LineSegments(geometry, material);
    this.grid.position.y = -1.6; // Floor level
    this.grid.userData.isVoidInfrastructure = true;
    this.scene.add(this.grid);
  }

  _createParticleField() {
    const count = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const alphas = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      alphas[i] = Math.random() * 0.3;
      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1));
    this._particleVelocities = velocities;

    const material = new THREE.PointsMaterial({
      size: 0.15,
      color: 0x4466aa,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geometry, material);
    this.particles.userData.isVoidInfrastructure = true;
    this.scene.add(this.particles);
  }

  _createAmbientLight() {
    this.ambientLight = new THREE.AmbientLight(0x111122, 0.2);
    this.scene.add(this.ambientLight);

    // Subtle point light at user's position
    this.userLight = new THREE.PointLight(0x3344aa, 0.5, 20);
    this.userLight.position.set(0, 0, 0);
    this.scene.add(this.userLight);
  }

  /**
   * Trigger a grid pulse radiating from a point.
   */
  pulseFrom(x, z, color = 0x4488ff) {
    const pulse = {
      x, z,
      radius: 0,
      maxRadius: 60,
      speed: 15,
      color,
      opacity: 0.6,
      ring: null,
    };

    // Create a ring geometry for the pulse
    const geometry = new THREE.RingGeometry(0, 0.5, 64);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, this.grid ? this.grid.position.y + 0.01 : -1.59, z);
    ring.userData.isVoidInfrastructure = true;
    this.scene.add(ring);
    pulse.ring = ring;

    this.gridPulses.push(pulse);
  }

  /**
   * Materialize the grid — fade it in. Called when the void starts responding.
   */
  materializeGrid(duration = 2.0) {
    if (!this.grid) return;
    this._gridMaterializeStart = this.time;
    this._gridMaterializeDuration = duration;
    this._gridMaterializing = true;
  }

  /**
   * Set ambient intensity — reacts to activity level.
   */
  setAmbientIntensity(intensity) {
    this.targetAmbientIntensity = Math.max(0, Math.min(1, intensity));
  }

  update(dt, cameraPosition) {
    this.time += dt;

    // Update grid materialization
    if (this._gridMaterializing && this.grid) {
      const elapsed = this.time - this._gridMaterializeStart;
      const t = Math.min(1, elapsed / this._gridMaterializeDuration);
      this.grid.material.opacity = t * 0.3;
      if (t >= 1) this._gridMaterializing = false;
    }

    // Update grid pulses
    for (let i = this.gridPulses.length - 1; i >= 0; i--) {
      const p = this.gridPulses[i];
      p.radius += p.speed * dt;
      p.opacity = 0.6 * (1 - p.radius / p.maxRadius);

      if (p.ring) {
        const inner = Math.max(0, p.radius - 0.5);
        p.ring.geometry.dispose();
        p.ring.geometry = new THREE.RingGeometry(inner, p.radius, 64);
        p.ring.material.opacity = Math.max(0, p.opacity);
      }

      if (p.radius >= p.maxRadius) {
        if (p.ring) {
          this.scene.remove(p.ring);
          p.ring.geometry.dispose();
          p.ring.material.dispose();
        }
        this.gridPulses.splice(i, 1);
      }
    }

    // Update particle field
    if (this.particles) {
      const pos = this.particles.geometry.attributes.position;
      const vel = this._particleVelocities;
      for (let i = 0; i < pos.count; i++) {
        pos.array[i * 3] += vel[i * 3];
        pos.array[i * 3 + 1] += vel[i * 3 + 1];
        pos.array[i * 3 + 2] += vel[i * 3 + 2];

        // Subtle drift toward origin
        pos.array[i * 3] += -pos.array[i * 3] * 0.0001;
        pos.array[i * 3 + 1] += -pos.array[i * 3 + 1] * 0.0001;
        pos.array[i * 3 + 2] += -pos.array[i * 3 + 2] * 0.0001;

        // Subtle breathing
        pos.array[i * 3 + 1] += Math.sin(this.time * 0.5 + i * 0.1) * 0.001;
      }
      pos.needsUpdate = true;
    }

    // Update user light position
    if (cameraPosition && this.userLight) {
      this.userLight.position.copy(cameraPosition);
    }

    // Smooth ambient intensity
    this.ambientIntensity += (this.targetAmbientIntensity - this.ambientIntensity) * dt * 2;
    if (this.ambientLight) {
      this.ambientLight.intensity = 0.2 + this.ambientIntensity * 0.5;
    }
    if (this.userLight) {
      this.userLight.intensity = 0.5 + this.ambientIntensity * 1.0;
    }
  }

  /**
   * Get the grid floor Y position.
   */
  getFloorY() {
    return this.grid ? this.grid.position.y : -1.6;
  }
}

window.VoidAesthetics = VoidAesthetics;
