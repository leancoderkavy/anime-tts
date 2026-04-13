#!/usr/bin/env node
// Manage the floating "sessions awaiting your attention" panel daemon.
// Subcommands: show | hide | toggle | status | list

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');
const { listAwaiting, clearSession } = require('../hooks/attention');

const PLUGIN_ROOT = path.join(__dirname, '..');
const PANEL_BIN = path.join(PLUGIN_ROOT, 'bin', 'attention-panel');
const PID_PATH = path.join(os.homedir(), '.claude', 'anime-tts-panel.pid');
const LOG_PATH = path.join(os.homedir(), '.claude', 'anime-tts-panel.log');

function readPid() {
  try {
    const pid = parseInt(fs.readFileSync(PID_PATH, 'utf8').trim(), 10);
    if (Number.isFinite(pid)) return pid;
  } catch (e) {}
  return null;
}

function isAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

function showPanel() {
  const existing = readPid();
  if (isAlive(existing)) {
    console.log(`Panel already running (pid ${existing}).`);
    return;
  }
  // Stale pid file
  if (existing) try { fs.unlinkSync(PID_PATH); } catch (e) {}

  if (!fs.existsSync(PANEL_BIN)) {
    console.error(`Panel binary missing at ${PANEL_BIN}. Run scripts/build-binaries.sh.`);
    process.exit(1);
  }

  const out = fs.openSync(LOG_PATH, 'a');
  const child = spawn(PANEL_BIN, [], {
    detached: true,
    stdio: ['ignore', out, out],
  });
  child.unref();
  console.log(`Panel launched (pid ${child.pid}). Click a row to dismiss it.`);
}

function hidePanel() {
  const pid = readPid();
  if (!isAlive(pid)) {
    console.log('Panel is not running.');
    try { fs.unlinkSync(PID_PATH); } catch (e) {}
    return;
  }
  try {
    process.kill(pid, 'SIGTERM');
    console.log(`Panel stopped (pid ${pid}).`);
  } catch (e) {
    console.error(`Failed to stop panel: ${e.message}`);
  }
  try { fs.unlinkSync(PID_PATH); } catch (e) {}
}

function statusPanel() {
  const pid = readPid();
  if (isAlive(pid)) console.log(`Panel running (pid ${pid}).`);
  else console.log('Panel is not running.');
}

function togglePanel() {
  const pid = readPid();
  if (isAlive(pid)) hidePanel();
  else showPanel();
}

function listSessions() {
  const items = listAwaiting();
  if (!items.length) {
    console.log('No sessions awaiting your attention. ✧');
    return;
  }
  console.log(`${items.length} awaiting:\n`);
  for (const s of items) {
    const ageSec = Math.max(0, Math.round((Date.now() - s.finishedAt) / 1000));
    const age = ageSec < 60 ? `${ageSec}s`
              : ageSec < 3600 ? `${Math.round(ageSec / 60)}m`
              : `${Math.round(ageSec / 3600)}h`;
    console.log(`  ▸ ${s.project.padEnd(24)} ${age.padStart(5)}   ${s.summary || '(awaiting)'}`);
    console.log(`    ${s.cwd}`);
  }
}

const cmd = (process.argv[2] || 'toggle').toLowerCase();
switch (cmd) {
  case 'show':   showPanel(); break;
  case 'hide':   hidePanel(); break;
  case 'toggle': togglePanel(); break;
  case 'status': statusPanel(); break;
  case 'list':   listSessions(); break;
  default:
    console.error(`Unknown command "${cmd}". Use: show | hide | toggle | status | list`);
    process.exit(1);
}
