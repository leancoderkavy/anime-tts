#!/usr/bin/env node
// Stop — border glow + TTS summary of Claude's response

const { play, loadConfig } = require('./play');
const { borderGlow } = require('./notify');
const { summarize } = require('./summarize');
const { speak, shouldSpeak } = require('./tts');

const config = loadConfig();
if (!config.enabled) process.exit(0);

play('stop');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => input += d);
process.stdin.on('end', async () => {
  if (config.visuals !== false) {
    borderGlow('8B5CF6', 4, 2.5);
  }

  if (!shouldSpeak('stop')) return;

  let message = '';
  try {
    const data = JSON.parse(input);
    message = data.last_assistant_message
      || data.stop_response
      || data.message
      || '';
  } catch (e) {}

  if (!message) return;

  try {
    const summary = await summarize(message, 'stop');
    if (summary) await speak(summary, 'stop');
  } catch (e) {}
});
