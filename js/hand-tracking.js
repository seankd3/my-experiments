/**
 * HandTracking — XR hand/controller input for gestural interaction.
 *
 * Supports:
 * - VR controller ray-casting (point at objects, grab, push)
 * - Hand tracking (pinch to grab, open palm to push)
 * - Desktop fallback (mouse ray-casting)
 *
 * Gestures:
 * - Point + trigger: select object
 * - Grab + move: physically reposition objects
 * - Push gesture: push ghost overlays to confirm/reject
 * - Squeeze: trigger voice input
 */
class HandTracking {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controllers = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredObject = null;
    this.grabbedObject = null;
    this.grabOffset = new THREE.Vector3();

    // Callbacks
    this.onSelect = null;    // (object, position) => {}
    this.onGrab = null;      // (object) => {}
    this.onRelease = null;   // (object, position) => {}
    this.onSqueeze = null;   // () => {}
    this.onHover = null;     // (object | null) => {}

    // Visual feedback
    this.pointerLine = null;
    this.pointerDot = null;
  }

  init() {
    this._setupDesktopControls();
    this._createPointerVisuals();
  }

  initXR(xrSession) {
    // Set up VR controllers
    for (let i = 0; i < 2; i++) {
      const controller = this.renderer.xr.getController(i);
      controller.userData.index = i;

      controller.addEventListener('selectstart', (e) => this._onSelectStart(e, controller));
      controller.addEventListener('selectend', (e) => this._onSelectEnd(e, controller));
      controller.addEventListener('squeezestart', () => {
        if (this.onSqueeze) this.onSqueeze();
      });

      // Visual: ray line from controller
      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -10),
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.3,
      });
      const line = new THREE.Line(lineGeom, lineMat);
      controller.add(line);
      controller.userData.ray = line;

      this.scene.add(controller);
      this.controllers.push(controller);

      // Controller grip space for grab gestures
      const grip = this.renderer.xr.getControllerGrip(i);
      this.scene.add(grip);
    }
  }

  _setupDesktopControls() {
    // Mouse for ray-casting on desktop
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this._desktopSelect();
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0 && this.grabbedObject) {
        if (this.onRelease) this.onRelease(this.grabbedObject, this.grabbedObject.position.clone());
        this.grabbedObject = null;
      }
    });
  }

  _createPointerVisuals() {
    // Intersection dot
    const dotGeom = new THREE.SphereGeometry(0.05, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0x88aaff,
      transparent: true,
      opacity: 0.6,
    });
    this.pointerDot = new THREE.Mesh(dotGeom, dotMat);
    this.pointerDot.visible = false;
    this.scene.add(this.pointerDot);
  }

  _desktopSelect() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this._raycastUserObjects();
    if (intersects.length > 0) {
      const hit = intersects[0];
      const obj = this._findVoidObject(hit.object);
      if (obj && this.onSelect) {
        this.onSelect(obj, hit.point);
      }
    }
  }

  _onSelectStart(event, controller) {
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = this._raycastUserObjects();
    if (intersects.length > 0) {
      const obj = this._findVoidObject(intersects[0].object);
      if (obj) {
        this.grabbedObject = obj;
        this.grabOffset.copy(obj.position).sub(intersects[0].point);
        if (this.onGrab) this.onGrab(obj);
      }
    } else {
      if (this.onSelect) this.onSelect(null, this.raycaster.ray.origin.clone());
    }
  }

  _onSelectEnd(event, controller) {
    if (this.grabbedObject) {
      if (this.onRelease) this.onRelease(this.grabbedObject, this.grabbedObject.position.clone());
      this.grabbedObject = null;
    }
  }

  _raycastUserObjects() {
    // Only raycast against user-created objects, not void infrastructure
    const targets = [];
    this.scene.traverse((child) => {
      if (child.isMesh && child.userData.voidId && !child.userData.isVoidInfrastructure) {
        targets.push(child);
      }
    });
    return this.raycaster.intersectObjects(targets, false);
  }

  _findVoidObject(threeObj) {
    let current = threeObj;
    while (current) {
      if (current.userData && current.userData.voidId) return current;
      current = current.parent;
    }
    return null;
  }

  update(dt) {
    // Desktop hover detection
    if (!this.renderer.xr.isPresenting) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this._raycastUserObjects();

      if (intersects.length > 0) {
        const obj = this._findVoidObject(intersects[0].object);
        if (obj !== this.hoveredObject) {
          // Unhover old
          if (this.hoveredObject && this.hoveredObject.material) {
            this.hoveredObject.material.opacity = this.hoveredObject.userData._originalOpacity || 0.7;
          }
          // Hover new
          this.hoveredObject = obj;
          if (obj && obj.material) {
            obj.userData._originalOpacity = obj.material.opacity;
            obj.material.opacity = Math.min(1, obj.material.opacity + 0.2);
          }
          if (this.onHover) this.onHover(obj);
        }
        // Show pointer dot
        this.pointerDot.visible = true;
        this.pointerDot.position.copy(intersects[0].point);
      } else {
        if (this.hoveredObject) {
          if (this.hoveredObject.material) {
            this.hoveredObject.material.opacity = this.hoveredObject.userData._originalOpacity || 0.7;
          }
          this.hoveredObject = null;
          if (this.onHover) this.onHover(null);
        }
        this.pointerDot.visible = false;
      }
    }

    // VR controller ray updates
    for (const controller of this.controllers) {
      if (controller.userData.ray) {
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

        const intersects = this._raycastUserObjects();
        if (intersects.length > 0) {
          // Shorten ray to intersection
          const dist = intersects[0].distance;
          const positions = controller.userData.ray.geometry.attributes.position;
          positions.setXYZ(1, 0, 0, -dist);
          positions.needsUpdate = true;
          controller.userData.ray.material.opacity = 0.6;
        } else {
          const positions = controller.userData.ray.geometry.attributes.position;
          positions.setXYZ(1, 0, 0, -10);
          positions.needsUpdate = true;
          controller.userData.ray.material.opacity = 0.2;
        }
      }
    }

    // Move grabbed object with controller
    if (this.grabbedObject && this.controllers.length > 0) {
      const controller = this.controllers[0];
      const tempMatrix = new THREE.Matrix4();
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

      // Project grabbed object along ray
      const dist = this.grabbedObject.position.distanceTo(this.raycaster.ray.origin);
      const newPos = this.raycaster.ray.origin.clone().add(
        this.raycaster.ray.direction.clone().multiplyScalar(dist)
      );
      this.grabbedObject.position.lerp(newPos.add(this.grabOffset), 0.3);
    }
  }
}

window.HandTracking = HandTracking;
