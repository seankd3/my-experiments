/**
 * main.js — The birth of the void.
 *
 * Wires all subsystems together and manages the interaction loop:
 *   You speak → Claude thinks → the void transforms → you see/feel the result
 */
(function () {
  // ─── Subsystem instances ───
  const engine = new VoidEngine();
  const audio = new AudioEngine();
  const claude = new ClaudeBridge();
  const voice = new VoiceInterface();
  const memory = new VoidMemory();
  let aesthetics, commander, hands, agents, ghost;

  // ─── State ───
  let isProcessing = false;
  let firstInteraction = true;

  // ─── DOM refs ───
  const apiKeyModal = document.getElementById('api-key-modal');
  const apiKeyInput = document.getElementById('api-key-input');
  const apiKeySubmit = document.getElementById('api-key-submit');
  const talkBtn = document.getElementById('talk-btn');
  const enterVrBtn = document.getElementById('enter-vr');
  const voiceIndicator = document.getElementById('voice-indicator');
  const transcriptEl = document.getElementById('transcript');
  const claudeResponseEl = document.getElementById('claude-response');

  // ─── Boot sequence ───

  function boot() {
    // Initialize engine
    engine.init();

    // Initialize subsystems that need the scene
    aesthetics = new VoidAesthetics(engine.scene);
    aesthetics.init();
    engine.aesthetics = aesthetics;

    audio.init();
    engine.audio = audio;

    commander = new SceneCommander(engine.scene, engine.camera, aesthetics, audio);
    engine.commander = commander;

    hands = new HandTracking(engine.scene, engine.camera, engine.renderer);
    hands.init();
    engine.hands = hands;

    agents = new AgentSystem(engine.scene, audio);
    engine.agents = agents;

    ghost = new GhostOverlay(engine.scene);
    engine.ghost = ghost;

    engine.memory = memory;

    // Wire up hand tracking callbacks
    hands.onSelect = onObjectSelect;
    hands.onGrab = onObjectGrab;
    hands.onRelease = onObjectRelease;
    hands.onSqueeze = onSqueeze;

    // Initialize voice
    voice.init();
    voice.onResult = onVoiceResult;
    voice.onInterim = onVoiceInterim;
    voice.onStart = () => voiceIndicator.classList.add('active');
    voice.onEnd = () => voiceIndicator.classList.remove('active');

    // Check for saved session
    if (memory.load()) {
      console.log('Loaded previous session:', memory.sessionId);
    }

    // Check for saved API key
    const savedKey = sessionStorage.getItem('void_api_key');
    if (savedKey) {
      claude.setApiKey(savedKey);
      apiKeyModal.classList.add('hidden');
    }

    // Check WebXR
    engine.checkXRSupport().then(supported => {
      if (!supported) {
        enterVrBtn.textContent = 'VR Not Available';
        enterVrBtn.style.opacity = '0.3';
        enterVrBtn.style.pointerEvents = 'none';
      }
    });

    // Start render loop
    engine.startRenderLoop(onFrame);

    // Auto-save memory periodically
    setInterval(() => memory.save(), 30000);
  }

  // ─── API Key handling ───

  apiKeySubmit.addEventListener('click', submitApiKey);
  apiKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitApiKey();
  });

  function submitApiKey() {
    const key = apiKeyInput.value.trim();
    if (!key) return;
    claude.setApiKey(key);
    sessionStorage.setItem('void_api_key', key);
    apiKeyModal.classList.add('hidden');
    audio.init();
    audio.startAmbientDrone();
    // Greeting pulse
    setTimeout(() => {
      aesthetics.pulseFrom(0, 0);
      audio.pulse();
      showClaudeResponse('What are we building?');
      voice.speak('What are we building?');
    }, 500);
  }

  // ─── VR entry ───

  enterVrBtn.addEventListener('click', async () => {
    const ok = await engine.enterVR();
    if (ok) {
      enterVrBtn.textContent = 'In the Void';
      enterVrBtn.classList.add('active');
    }
  });

  // ─── Voice controls ───

  // Hold-to-talk (desktop)
  talkBtn.addEventListener('mousedown', () => {
    audio.init();
    voice.startListening();
    talkBtn.classList.add('active');
    talkBtn.textContent = 'Listening...';
  });
  talkBtn.addEventListener('mouseup', () => {
    voice.stopListening();
    talkBtn.classList.remove('active');
    talkBtn.textContent = 'Hold to Speak';
  });
  talkBtn.addEventListener('mouseleave', () => {
    if (voice.isListening) {
      voice.stopListening();
      talkBtn.classList.remove('active');
      talkBtn.textContent = 'Hold to Speak';
    }
  });

  // Keyboard shortcut: hold Space to talk
  let spaceHeld = false;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !spaceHeld && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      spaceHeld = true;
      audio.init();
      voice.startListening();
      talkBtn.classList.add('active');
      talkBtn.textContent = 'Listening...';
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && spaceHeld) {
      e.preventDefault();
      spaceHeld = false;
      voice.stopListening();
      talkBtn.classList.remove('active');
      talkBtn.textContent = 'Hold to Speak';
    }
  });

  // ─── Voice result handlers ───

  function onVoiceInterim(text) {
    transcriptEl.textContent = text;
  }

  async function onVoiceResult(transcript) {
    transcriptEl.textContent = transcript;
    if (isProcessing || !transcript.trim()) return;

    isProcessing = true;

    // First interaction — materialize the grid
    if (firstInteraction) {
      firstInteraction = false;
      aesthetics.materializeGrid(2.0);
      aesthetics.pulseFrom(0, 0);
      audio.pulse();
    }

    // Show thinking state
    showClaudeResponse('...');
    audio.voidWhisper();

    try {
      // Add scene context for Claude
      const sceneContext = claude.getSceneContext(commander);
      const memoryContext = memory.getContextSummary();
      const enrichedMessage = transcript +
        (sceneContext.length > 0 ? `\n\n[Current scene objects: ${JSON.stringify(sceneContext)}]` : '') +
        (memoryContext ? `\n[Session context: ${memoryContext}]` : '');

      const response = await claude.send(enrichedMessage);

      // Execute scene commands
      if (response.commands.length > 0) {
        const results = commander.execute(response.commands);
        memory.recordCommands(response.commands);
        console.log('Executed:', results);

        // Pulse from user position on each interaction
        const userPos = engine.getUserPosition();
        aesthetics.pulseFrom(userPos.x, userPos.z);
      }

      // Show and speak Claude's response
      if (response.speech) {
        showClaudeResponse(response.speech);
        voice.speak(response.speech);
      }

      // Modulate ambient based on activity
      aesthetics.setAmbientIntensity(Math.min(1, commander.objects.size * 0.05));
      audio.modulateDrone(Math.min(1, commander.objects.size * 0.05));

    } catch (error) {
      console.error('Claude error:', error);
      showClaudeResponse(`Error: ${error.message}`);
      audio.warning();
    }

    isProcessing = false;

    // Clear transcript after a moment
    setTimeout(() => { transcriptEl.textContent = ''; }, 3000);
  }

  // ─── Object interaction handlers ───

  function onObjectSelect(object, point) {
    if (!object) return;
    const id = object.userData.voidId;
    if (id) {
      // Highlight and tell Claude what was selected
      aesthetics.pulseFrom(point.x, point.z, 0xffaa44);
      audio.pulse(200, 0.3);
    }
  }

  function onObjectGrab(object) {
    if (object.material) {
      object.userData._preGrabOpacity = object.material.opacity;
      object.material.opacity = 1.0;
    }
  }

  function onObjectRelease(object, newPosition) {
    if (object.material && object.userData._preGrabOpacity !== undefined) {
      object.material.opacity = object.userData._preGrabOpacity;
    }

    // If an active ghost proposal exists and user pushes an object, accept it
    const activeProposal = ghost.activeProposal;
    if (activeProposal) {
      const commands = ghost.accept(activeProposal.id);
      if (commands.length > 0) {
        commander.execute(commands);
        memory.recordCommands(commands);
        audio.chime();
      }
    }
  }

  function onSqueeze() {
    // Squeeze controller to toggle voice
    if (voice.isListening) {
      voice.stopListening();
    } else {
      voice.startListening();
    }
  }

  // ─── UI helpers ───

  function showClaudeResponse(text) {
    claudeResponseEl.textContent = text;
    claudeResponseEl.classList.add('visible');

    // Auto-hide after some time if short
    if (text.length < 100) {
      setTimeout(() => {
        claudeResponseEl.classList.remove('visible');
      }, 8000);
    }
  }

  // ─── Per-frame callback ───

  function onFrame(dt, timestamp, frame) {
    // Any per-frame logic beyond subsystem updates
    // (subsystems are already updated by engine.startRenderLoop)
  }

  // ─── Start everything ───
  boot();
})();
