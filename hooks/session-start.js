#!/usr/bin/env node
// Session start — visual flash + TTS greeting

const { play, loadConfig } = require('./play');
const { flash, sparkle, notify } = require('./notify');
const { speak } = require('./tts');
const { rainbow, line } = require('./ansi');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const config = loadConfig();
if (!config.enabled) process.exit(0);

play('session_start');

if (config.visuals !== false) {
  flash('8B5CF6', 0.5);
  setTimeout(() => sparkle('A78BFA', 18, 1.8), 120);
}

// Auto-launch the floating attention panel if it's not already running.
// Idempotent — checks PID file and verifies the process is alive.
// Disable via config.json: "attention_panel": { "auto_start": false }
(function ensurePanelRunning() {
  if (config.attention_panel && config.attention_panel.auto_start === false) return;
  try {
    const pidPath = path.join(os.homedir(), '.claude', 'anime-tts-panel.pid');
    let alive = false;
    try {
      const pid = parseInt(fs.readFileSync(pidPath, 'utf8').trim(), 10);
      if (Number.isFinite(pid)) {
        try { process.kill(pid, 0); alive = true; } catch (e) {}
      }
    } catch (e) {}
    if (alive) return;

    const panelBin = path.join(__dirname, '..', 'bin', 'attention-panel');
    if (!fs.existsSync(panelBin)) return;

    const logPath = path.join(os.homedir(), '.claude', 'anime-tts-panel.log');
    const out = fs.openSync(logPath, 'a');
    const child = spawn(panelBin, [], {
      detached: true,
      stdio: ['ignore', out, out],
    });
    child.unref();
  } catch (e) {}
})();

// TTS greeting — Rei-style soft Japanese
speak('Junbi, kanryou. Hajimemashou.', 'session_start');

process.stdout.write(
  'anime-tts plugin active. ' +
  'After completing tasks, occasionally include a relevant kaomoji in your response ' +
  '(like (ﾉ◕ヮ◕)ﾉ*:・゚✧ or ✧٩(ˊᗜˋ*)و✧). Keep it subtle — one per response max, at the end.'
);
