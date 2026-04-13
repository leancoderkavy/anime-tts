#!/usr/bin/env node
// Session end — farewell flash

const { loadConfig } = require('./play');
const { flash, sparkle } = require('./notify');
const { speak, shouldSpeak } = require('./tts');
const { clearSession } = require('./attention');

let sessionEndInput = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => sessionEndInput += d);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(sessionEndInput);
    if (data.session_id) clearSession(data.session_id);
  } catch (e) {}
});

const config = loadConfig();
if (!config.enabled) process.exit(0);

if (config.visuals !== false) {
  flash('6366F1', 0.4); // indigo triple-pulse fade-out
  setTimeout(() => sparkle('C7D2FE', 12, 2.0), 100);
}
