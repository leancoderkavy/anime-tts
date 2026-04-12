#!/usr/bin/env node
// Notification — macOS notification banner (no TTS to avoid spam)

const { loadConfig } = require('./play');
const { notify } = require('./notify');

const config = loadConfig();
if (!config.enabled) process.exit(0);

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => input += d);
process.stdin.on('end', () => {
  let title = 'Claude Code';
  let message = '';
  try {
    const data = JSON.parse(input);
    title = data.title || 'Claude Code';
    message = data.message || '';
  } catch (e) {}

  if (message && config.visuals !== false) {
    notify(title, message);
  }
});
