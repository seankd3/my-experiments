/**
 * VoidEngine — the heart of the void.
 *
 * Orchestrates Three.js scene, WebXR session, render loop.
 * Owns the scene graph and coordinates all subsystems.
 */
class VoidEngine {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = null;
    this.xrSession = null;
    this.isVR = false;

    // Subsystems (injected after construction)
    this.aesthetics = null;
    this.audio = null;
    this.commander = null;
    this.hands = null;
    this.agents = null;
    this.ghost = null;
    this.memory = null;

    // Desktop orbit
    this._orbitAngle = 0;
    this._orbitRadius = 5;
    this._orbitY = 2;
    this._isDragging = false;
    this._lastMouseX = 0;
    this._lastMouseY = 0;

    // Gravity drift (VR)
    this._userVelocity = new THREE.Vector3();
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Camera
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.6, 3);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.xr.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    const container = document.getElementById('canvas-container');
    container.appendChild(this.renderer.domElement);

    // Clock
    this.clock = new THREE.Clock();

    // Resize
    window.addEventListener('resize', () => this._onResize());

    // Desktop orbit controls
    this._setupOrbitControls();

    return this;
  }

  _setupOrbitControls() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) { // Right-click to orbit
        this._isDragging = true;
        this._lastMouseX = e.clientX;
        this._lastMouseY = e.clientY;
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this._isDragging) {
        const dx = e.clientX - this._lastMouseX;
        const dy = e.clientY - this._lastMouseY;
        this._orbitAngle -= dx * 0.005;
        this._orbitY = Math.max(0.5, Math.min(10, this._orbitY + dy * 0.01));
        this._lastMouseX = e.clientX;
        this._lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => { this._isDragging = false; });

    canvas.addEventListener('wheel', (e) => {
      this._orbitRadius = Math.max(1, Math.min(50, this._orbitRadius + e.deltaY * 0.01));
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Check if WebXR is available and return the VR button state */
  async checkXRSupport() {
    if (!navigator.xr) return false;
    try {
      return await navigator.xr.isSessionSupported('immersive-vr');
    } catch (e) {
      return false;
    }
  }

  /** Enter VR mode */
  async enterVR() {
    if (!navigator.xr) return false;
    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'hand-tracking'],
      });
      this.renderer.xr.setSession(session);
      this.xrSession = session;
      this.isVR = true;

      session.addEventListener('end', () => {
        this.isVR = false;
        this.xrSession = null;
      });

      // Initialize hand tracking for VR
      if (this.hands) {
        this.hands.initXR(session);
      }

      return true;
    } catch (e) {
      console.error('Failed to enter VR:', e);
      return false;
    }
  }

  /** Main render loop — called via renderer.setAnimationLoop */
  startRenderLoop(onFrame) {
    this.renderer.setAnimationLoop((timestamp, frame) => {
      const dt = Math.min(this.clock.getDelta(), 0.05); // Cap delta

      // Desktop camera orbit (non-VR only)
      if (!this.isVR) {
        this.camera.position.x = Math.sin(this._orbitAngle) * this._orbitRadius;
        this.camera.position.z = Math.cos(this._orbitAngle) * this._orbitRadius;
        this.camera.position.y = this._orbitY;
        this.camera.lookAt(0, 0, 0);
      }

      // Gravity drift in VR
      if (this.isVR && this.commander) {
        const cameraWorldPos = new THREE.Vector3();
        this.camera.getWorldPosition(cameraWorldPos);
        const gravity = this.commander.computeGravityForce(cameraWorldPos);
        // Can't directly move the XR camera, but we can offset the reference space
        // For now this is a visual hint via the aesthetics
      }

      // Update subsystems
      if (this.aesthetics) {
        const camPos = new THREE.Vector3();
        this.camera.getWorldPosition(camPos);
        this.aesthetics.update(dt, camPos);
      }
      if (this.commander) this.commander.update(dt);
      if (this.hands) this.hands.update(dt);
      if (this.agents) this.agents.update(dt);
      if (this.ghost) this.ghost.update(dt);

      // Custom per-frame callback
      if (onFrame) onFrame(dt, timestamp, frame);

      // Render
      this.renderer.render(this.scene, this.camera);
    });
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /** Get the user's world position (works in both VR and desktop) */
  getUserPosition() {
    const pos = new THREE.Vector3();
    this.camera.getWorldPosition(pos);
    return pos;
  }
}

window.VoidEngine = VoidEngine;
