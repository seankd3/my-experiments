/**
 * VoidMemory — session accumulation and environment memory.
 *
 * The void remembers. Twenty minutes in, you're standing in a world
 * that is the crystallized history of every thought you've had.
 *
 * Stores:
 * - Every command Claude has executed (the session's spatial history)
 * - User preferences discovered through interaction (low-frequency tones, organic shapes, etc.)
 * - Named locations and bookmarks
 * - The conversation thread
 *
 * Persists to localStorage so sessions can be resumed.
 */
class VoidMemory {
  constructor() {
    this.sessionId = `void_${Date.now()}`;
    this.commandHistory = [];
    this.preferences = {};
    this.bookmarks = {};
    this.sessionStart = Date.now();
    this.interactionCount = 0;
  }

  /** Record a command that was executed */
  recordCommand(command) {
    this.commandHistory.push({
      timestamp: Date.now(),
      command,
    });
    this.interactionCount++;
  }

  /** Record a batch of commands */
  recordCommands(commands) {
    for (const cmd of commands) this.recordCommand(cmd);
  }

  /** Set a user preference */
  setPreference(key, value) {
    this.preferences[key] = value;
  }

  /** Get a user preference */
  getPreference(key, defaultValue) {
    return this.preferences[key] !== undefined ? this.preferences[key] : defaultValue;
  }

  /** Bookmark a location */
  bookmark(name, position) {
    this.bookmarks[name] = {
      position: [position.x, position.y, position.z],
      timestamp: Date.now(),
    };
  }

  /** Get a bookmark */
  getBookmark(name) {
    return this.bookmarks[name] || null;
  }

  /** Get session duration in seconds */
  getSessionDuration() {
    return (Date.now() - this.sessionStart) / 1000;
  }

  /** Get a context summary for Claude — what has happened in this session */
  getContextSummary() {
    const duration = this.getSessionDuration();
    const mins = Math.floor(duration / 60);
    const objectCount = new Set(
      this.commandHistory
        .map(h => h.command.id)
        .filter(Boolean)
    ).size;

    let summary = `Session duration: ${mins} minutes. `;
    summary += `${this.interactionCount} interactions. `;
    summary += `${objectCount} objects created. `;

    if (Object.keys(this.preferences).length > 0) {
      summary += `User preferences: ${JSON.stringify(this.preferences)}. `;
    }

    if (Object.keys(this.bookmarks).length > 0) {
      summary += `Bookmarks: ${Object.keys(this.bookmarks).join(', ')}. `;
    }

    return summary;
  }

  /** Save to localStorage */
  save() {
    try {
      const data = {
        sessionId: this.sessionId,
        commandHistory: this.commandHistory.slice(-200), // Keep last 200
        preferences: this.preferences,
        bookmarks: this.bookmarks,
        sessionStart: this.sessionStart,
        interactionCount: this.interactionCount,
      };
      localStorage.setItem('void_session', JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save void memory:', e);
    }
  }

  /** Load from localStorage */
  load() {
    try {
      const raw = localStorage.getItem('void_session');
      if (!raw) return false;
      const data = JSON.parse(raw);
      this.sessionId = data.sessionId;
      this.commandHistory = data.commandHistory || [];
      this.preferences = data.preferences || {};
      this.bookmarks = data.bookmarks || {};
      this.sessionStart = data.sessionStart || Date.now();
      this.interactionCount = data.interactionCount || 0;
      return true;
    } catch (e) {
      console.warn('Failed to load void memory:', e);
      return false;
    }
  }

  /** Clear saved data */
  clear() {
    localStorage.removeItem('void_session');
    this.commandHistory = [];
    this.preferences = {};
    this.bookmarks = {};
    this.interactionCount = 0;
  }

  /** Get the commands needed to rebuild the current scene state */
  getReplayCommands() {
    // Filter to only the latest state of each object
    const latestById = new Map();
    const removed = new Set();

    for (const entry of this.commandHistory) {
      const cmd = entry.command;
      if (cmd.type === 'remove') {
        removed.add(cmd.id);
        latestById.delete(cmd.id);
      } else if (cmd.type === 'clear') {
        latestById.clear();
        removed.clear();
      } else if (cmd.id && !removed.has(cmd.id)) {
        latestById.set(cmd.id, cmd);
      }
    }

    return Array.from(latestById.values());
  }
}

window.VoidMemory = VoidMemory;
