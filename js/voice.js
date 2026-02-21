/**
 * VoiceInterface — speech recognition and synthesis for the void.
 *
 * In non-VR: hold-to-talk button.
 * In VR: voice-activated (always listening) or controller-triggered.
 *
 * Uses Web Speech API for recognition and SpeechSynthesis for Claude's voice.
 */
class VoiceInterface {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.onResult = null;     // callback(transcript)
    this.onInterim = null;    // callback(partialTranscript)
    this.onStart = null;
    this.onEnd = null;
    this.supported = false;
    this._selectedVoice = null;
  }

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    this.supported = true;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (interim && this.onInterim) this.onInterim(interim);
      if (final && this.onResult) this.onResult(final);
    };

    this.recognition.onerror = (event) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error);
      }
    };

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStart) this.onStart();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEnd) this.onEnd();
    };

    // Pre-select a good voice for Claude
    this._loadVoice();
  }

  _loadVoice() {
    const pickVoice = () => {
      const voices = this.synthesis.getVoices();
      // Prefer a deep, calm English voice
      const preferred = ['Google UK English Male', 'Daniel', 'Alex', 'Microsoft David', 'english'];
      for (const pref of preferred) {
        const v = voices.find(v => v.name.toLowerCase().includes(pref.toLowerCase()) && v.lang.startsWith('en'));
        if (v) { this._selectedVoice = v; return; }
      }
      // Fallback to any English voice
      this._selectedVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    };

    if (this.synthesis.getVoices().length > 0) {
      pickVoice();
    } else {
      this.synthesis.onvoiceschanged = pickVoice;
    }
  }

  startListening() {
    if (!this.supported || this.isListening) return;
    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Could not start recognition:', e);
    }
  }

  stopListening() {
    if (!this.supported || !this.isListening) return;
    try {
      this.recognition.stop();
    } catch (e) {}
  }

  /** Make the void speak. Returns a promise that resolves when done. */
  speak(text) {
    return new Promise((resolve) => {
      if (!text) { resolve(); return; }
      this.synthesis.cancel(); // Stop any current speech

      const utterance = new SpeechSynthesisUtterance(text);
      if (this._selectedVoice) utterance.voice = this._selectedVoice;
      utterance.rate = 0.9;
      utterance.pitch = 0.8; // Lower pitch for gravitas
      utterance.volume = 0.8;

      utterance.onend = resolve;
      utterance.onerror = resolve;

      this.synthesis.speak(utterance);
    });
  }

  /** Stop any ongoing speech */
  silence() {
    this.synthesis.cancel();
  }
}

window.VoiceInterface = VoiceInterface;
