// Shared state for "sessions needing user attention".
// Written by stop.js, cleared by prompt-submit.js / session-end.js,
// read by the floating attention panel (bin/attention-panel).

const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_PATH = path.join(os.homedir(), '.claude', 'anime-tts-attention.json');
const LOCK_PATH = STATE_PATH + '.lock';

function readState() {
  try {
    const raw = fs.readFileSync(STATE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.sessions) return parsed;
  } catch (e) {}
  return { sessions: {} };
}

function writeState(state) {
  try {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    // Best-effort atomic write via temp + rename
    const tmp = STATE_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, STATE_PATH);
  } catch (e) {}
}

function projectName(cwd) {
  if (!cwd) return 'unknown';
  return path.basename(cwd) || cwd;
}

function markAwaiting({ sessionId, cwd, summary }) {
  if (!sessionId) return;
  const state = readState();
  state.sessions[sessionId] = {
    sessionId,
    cwd: cwd || '',
    project: projectName(cwd),
    summary: (summary || '').slice(0, 160),
    finishedAt: Date.now(),
  };
  writeState(state);
}

function clearSession(sessionId) {
  if (!sessionId) return;
  const state = readState();
  if (state.sessions[sessionId]) {
    delete state.sessions[sessionId];
    writeState(state);
  }
}

function listAwaiting() {
  const state = readState();
  return Object.values(state.sessions).sort((a, b) => a.finishedAt - b.finishedAt);
}

module.exports = {
  STATE_PATH,
  readState,
  writeState,
  markAwaiting,
  clearSession,
  listAwaiting,
};
