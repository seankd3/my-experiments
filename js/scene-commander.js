/**
 * SceneCommander — executes Claude's scene-graph commands into live Three.js mutations.
 *
 * Claude returns a JSON array of commands. Each command has a `type` and params.
 * This module interprets them and mutates the scene in real-time.
 *
 * Command protocol:
 *   { type: "create", id, geometry, radius, position, color, wireframe, opacity, scale }
 *   { type: "modify", id, position, rotation, scale, color, opacity, wireframe }
 *   { type: "remove", id }
 *   { type: "group", id, children: [ids] }
 *   { type: "connect", from, to, color, opacity }
 *   { type: "light", id, kind, color, intensity, position }
 *   { type: "text", id, content, position, size, color }
 *   { type: "animate", id, property, to, duration, loop }
 *   { type: "pulse", origin: [x,y,z] }
 *   { type: "camera", position, lookAt, duration }
 *   { type: "sound", kind, params }
 *   { type: "gravity", target, strength }
 *   { type: "clear" }
 */
class SceneCommander {
  constructor(scene, camera, aesthetics, audio) {
    this.scene = scene;
    this.camera = camera;
    this.aesthetics = aesthetics;
    this.audio = audio;
    this.objects = new Map();
    this.connections = new Map();
    this.animations = [];
    this.gravities = [];
  }

  execute(commands) {
    if (!Array.isArray(commands)) return [];
    const results = [];
    for (const cmd of commands) {
      try {
        results.push(this._exec(cmd));
      } catch (e) {
        console.error('SceneCommander error:', cmd, e);
        results.push(`Error: ${e.message}`);
      }
    }
    return results;
  }

  _exec(cmd) {
    switch (cmd.type) {
      case 'create': return this._create(cmd);
      case 'modify': return this._modify(cmd);
      case 'remove': return this._remove(cmd);
      case 'group': return this._group(cmd);
      case 'connect': return this._connect(cmd);
      case 'light': return this._light(cmd);
      case 'text': return this._text(cmd);
      case 'animate': return this._animate(cmd);
      case 'pulse': return this._pulse(cmd);
      case 'camera': return this._cameraCmd(cmd);
      case 'sound': return this._sound(cmd);
      case 'gravity': return this._gravity(cmd);
      case 'clear': return this._clear();
      default: return `Unknown: ${cmd.type}`;
    }
  }

  _makeGeometry(cmd) {
    switch (cmd.geometry || 'box') {
      case 'sphere': return new THREE.SphereGeometry(cmd.radius || 1, 24, 24);
      case 'box': return new THREE.BoxGeometry(cmd.width || 1, cmd.height || 1, cmd.depth || 1);
      case 'cylinder': return new THREE.CylinderGeometry(cmd.radiusTop || 0.5, cmd.radiusBottom || 0.5, cmd.height || 1, 16);
      case 'torus': return new THREE.TorusGeometry(cmd.radius || 1, cmd.tube || 0.3, 16, 32);
      case 'cone': return new THREE.ConeGeometry(cmd.radius || 0.5, cmd.height || 1, 16);
      case 'plane': return new THREE.PlaneGeometry(cmd.width || 1, cmd.height || 1);
      case 'icosahedron': return new THREE.IcosahedronGeometry(cmd.radius || 1, cmd.detail || 0);
      case 'octahedron': return new THREE.OctahedronGeometry(cmd.radius || 1, cmd.detail || 0);
      case 'dodecahedron': return new THREE.DodecahedronGeometry(cmd.radius || 1, cmd.detail || 0);
      case 'torusKnot': return new THREE.TorusKnotGeometry(cmd.radius || 1, cmd.tube || 0.3, 64, 8);
      default: return new THREE.BoxGeometry(1, 1, 1);
    }
  }

  _create(cmd) {
    const color = new THREE.Color(cmd.color || '#4488ff');
    const wireframe = cmd.wireframe !== false;
    const mat = wireframe
      ? new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: cmd.opacity || 0.7 })
      : new THREE.MeshStandardMaterial({ color, emissive: color.clone().multiplyScalar(0.3), metalness: 0.3, roughness: 0.7, transparent: true, opacity: cmd.opacity || 0.9 });

    const mesh = new THREE.Mesh(this._makeGeometry(cmd), mat);
    if (cmd.position) mesh.position.set(...cmd.position);
    if (cmd.rotation) mesh.rotation.set(...cmd.rotation);

    const targetScale = cmd.scale
      ? (Array.isArray(cmd.scale) ? new THREE.Vector3(...cmd.scale) : new THREE.Vector3(cmd.scale, cmd.scale, cmd.scale))
      : new THREE.Vector3(1, 1, 1);

    // Start tiny, animate in
    mesh.scale.set(0.01, 0.01, 0.01);
    mesh.userData.voidId = cmd.id;
    this.scene.add(mesh);
    this.objects.set(cmd.id, mesh);

    this.animations.push({
      object: mesh, property: 'scale',
      from: new THREE.Vector3(0.01, 0.01, 0.01), to: targetScale,
      startTime: performance.now(), duration: 800, easing: 'easeOutElastic',
    });

    return `Created ${cmd.geometry || 'box'} "${cmd.id}"`;
  }

  _modify(cmd) {
    const obj = this.objects.get(cmd.id);
    if (!obj) return `Not found: "${cmd.id}"`;
    const dur = cmd.duration || 600;

    if (cmd.position) {
      this.animations.push({
        object: obj, property: 'position',
        from: obj.position.clone(), to: new THREE.Vector3(...cmd.position),
        startTime: performance.now(), duration: dur, easing: 'easeInOutCubic',
      });
    }
    if (cmd.rotation) {
      this.animations.push({
        object: obj, property: 'rotation',
        from: new THREE.Vector3(obj.rotation.x, obj.rotation.y, obj.rotation.z),
        to: new THREE.Vector3(...cmd.rotation),
        startTime: performance.now(), duration: dur, easing: 'easeInOutCubic',
      });
    }
    if (cmd.scale) {
      const target = Array.isArray(cmd.scale) ? new THREE.Vector3(...cmd.scale) : new THREE.Vector3(cmd.scale, cmd.scale, cmd.scale);
      this.animations.push({
        object: obj, property: 'scale',
        from: obj.scale.clone(), to: target,
        startTime: performance.now(), duration: dur, easing: 'easeInOutCubic',
      });
    }
    if (cmd.color && obj.material) obj.material.color.set(cmd.color);
    if (cmd.opacity !== undefined && obj.material) obj.material.opacity = cmd.opacity;
    if (cmd.wireframe !== undefined && obj.material) obj.material.wireframe = cmd.wireframe;
    return `Modified "${cmd.id}"`;
  }

  _remove(cmd) {
    const obj = this.objects.get(cmd.id);
    if (!obj) return `Not found: "${cmd.id}"`;
    this.animations.push({
      object: obj, property: 'scale',
      from: obj.scale.clone(), to: new THREE.Vector3(0.001, 0.001, 0.001),
      startTime: performance.now(), duration: 500, easing: 'easeInCubic',
      onComplete: () => {
        this.scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
        this.objects.delete(cmd.id);
      },
    });
    return `Removing "${cmd.id}"`;
  }

  _group(cmd) {
    const group = new THREE.Group();
    group.userData.voidId = cmd.id;
    if (cmd.position) group.position.set(...cmd.position);
    for (const childId of (cmd.children || [])) {
      const child = this.objects.get(childId);
      if (child) { this.scene.remove(child); group.add(child); }
    }
    this.scene.add(group);
    this.objects.set(cmd.id, group);
    return `Grouped "${cmd.id}"`;
  }

  _connect(cmd) {
    const from = this.objects.get(cmd.from);
    const to = this.objects.get(cmd.to);
    if (!from || !to) return 'Connection failed: missing endpoint';
    const id = cmd.id || `${cmd.from}->${cmd.to}`;
    if (this.connections.has(id)) this.scene.remove(this.connections.get(id));

    const geom = new THREE.BufferGeometry().setFromPoints([from.position.clone(), to.position.clone()]);
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(cmd.color || '#334477'), transparent: true, opacity: cmd.opacity || 0.4 });
    const line = new THREE.Line(geom, mat);
    line.userData.from = cmd.from;
    line.userData.to = cmd.to;
    this.scene.add(line);
    this.connections.set(id, line);
    return `Connected "${cmd.from}" -> "${cmd.to}"`;
  }

  _light(cmd) {
    const color = new THREE.Color(cmd.color || '#ffffff');
    let light;
    switch (cmd.kind || 'point') {
      case 'spot': light = new THREE.SpotLight(color, cmd.intensity || 1); break;
      case 'directional': light = new THREE.DirectionalLight(color, cmd.intensity || 1); break;
      default: light = new THREE.PointLight(color, cmd.intensity || 1, cmd.distance || 50);
    }
    if (cmd.position) light.position.set(...cmd.position);
    light.userData.voidId = cmd.id;
    this.scene.add(light);
    this.objects.set(cmd.id, light);
    return `Light "${cmd.id}"`;
  }

  _text(cmd) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024; canvas.height = 256;
    const fontSize = Math.floor((cmd.size || 0.5) * 128);
    ctx.font = `${fontSize}px Courier New`;
    ctx.fillStyle = cmd.color || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cmd.content || '', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(4 * (cmd.size || 0.5), 1 * (cmd.size || 0.5), 1);
    if (cmd.position) sprite.position.set(...cmd.position);
    sprite.userData.voidId = cmd.id;
    this.scene.add(sprite);
    this.objects.set(cmd.id, sprite);
    return `Text "${cmd.id}"`;
  }

  _animate(cmd) {
    const obj = this.objects.get(cmd.id);
    if (!obj) return `Not found: "${cmd.id}"`;
    this.animations.push({
      object: obj, propertyPath: cmd.property,
      from: this._getNested(obj, cmd.property), to: cmd.to,
      startTime: performance.now(), duration: (cmd.duration || 1) * 1000,
      loop: cmd.loop || false, isScalar: true,
    });
    return `Animating "${cmd.id}"`;
  }

  _pulse(cmd) {
    const origin = cmd.origin || [0, 0, 0];
    this.aesthetics.pulseFrom(origin[0], origin[2]);
    this.audio.pulse();
    return 'Pulse';
  }

  _cameraCmd(cmd) {
    if (cmd.position) {
      this.animations.push({
        object: this.camera, property: 'position',
        from: this.camera.position.clone(), to: new THREE.Vector3(...cmd.position),
        startTime: performance.now(), duration: (cmd.duration || 1) * 1000, easing: 'easeInOutCubic',
      });
    }
    return 'Camera moved';
  }

  _sound(cmd) {
    const p = cmd.params || {};
    switch (cmd.kind) {
      case 'chime': this.audio.chime(p.frequency, p.duration); break;
      case 'pulse': this.audio.pulse(p.frequency, p.duration); break;
      case 'agent': this.audio.agentDispatch(); break;
      case 'warning': this.audio.warning(); break;
      case 'whisper': this.audio.voidWhisper(); break;
    }
    return `Sound: ${cmd.kind}`;
  }

  _gravity(cmd) {
    const obj = this.objects.get(cmd.target);
    if (!obj) return `Not found: "${cmd.target}"`;
    this.gravities.push({ target: obj, strength: cmd.strength || 0.5 });
    return `Gravity -> "${cmd.target}"`;
  }

  _clear() {
    for (const [, obj] of this.objects) {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
    this.objects.clear();
    for (const [, line] of this.connections) this.scene.remove(line);
    this.connections.clear();
    this.animations = [];
    this.gravities = [];
    return 'Cleared';
  }

  computeGravityForce(userPos) {
    const force = new THREE.Vector3();
    for (const g of this.gravities) {
      const dir = g.target.position.clone().sub(userPos);
      const dist = dir.length();
      if (dist > 0.5) {
        dir.normalize().multiplyScalar(g.strength / (dist * dist) * 0.01);
        force.add(dir);
      }
    }
    return force;
  }

  update(dt) {
    const now = performance.now();
    this.animations = this.animations.filter(a => {
      const elapsed = now - a.startTime;
      let t = Math.min(elapsed / a.duration, 1.0);
      t = this._ease(t, a.easing);

      if (a.isScalar) {
        this._setNested(a.object, a.propertyPath, a.from + (a.to - a.from) * t);
      } else if (a.property === 'scale' || a.property === 'position') {
        a.object[a.property].lerpVectors(a.from, a.to, t);
      } else if (a.property === 'rotation') {
        a.object.rotation.x = a.from.x + (a.to.x - a.from.x) * t;
        a.object.rotation.y = a.from.y + (a.to.y - a.from.y) * t;
        a.object.rotation.z = a.from.z + (a.to.z - a.from.z) * t;
      }

      if (elapsed >= a.duration) {
        if (a.loop) { a.startTime = now; return true; }
        if (a.onComplete) a.onComplete();
        return false;
      }
      return true;
    });

    // Update connection line endpoints
    for (const [, line] of this.connections) {
      const from = this.objects.get(line.userData.from);
      const to = this.objects.get(line.userData.to);
      if (from && to) {
        const pos = line.geometry.attributes.position;
        pos.setXYZ(0, from.position.x, from.position.y, from.position.z);
        pos.setXYZ(1, to.position.x, to.position.y, to.position.z);
        pos.needsUpdate = true;
      }
    }
  }

  _ease(t, type) {
    switch (type) {
      case 'easeInOutCubic': return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
      case 'easeOutElastic': return t===0||t===1 ? t : Math.pow(2,-10*t)*Math.sin((t*10-0.75)*(2*Math.PI/3))+1;
      case 'easeInCubic': return t*t*t;
      case 'easeOutCubic': return 1-Math.pow(1-t,3);
      default: return t;
    }
  }

  _getNested(obj, path) {
    return path.split('.').reduce((o, k) => o[k], obj);
  }

  _setNested(obj, path, val) {
    const parts = path.split('.');
    const last = parts.pop();
    parts.reduce((o, k) => o[k], obj)[last] = val;
  }
}

window.SceneCommander = SceneCommander;
