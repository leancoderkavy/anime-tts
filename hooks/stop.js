#!/usr/bin/env node
// Stop — border glow + TTS summary of Claude's response

const { play, loadConfig } = require('./play');
const { borderGlow, sparkle } = require('./notify');
const { summarize } = require('./summarize');
const { speak, shouldSpeak } = require('./tts');
const { gradient, line } = require('./ansi');

const config = loadConfig();
if (!config.enabled) process.exit(0);

play('stop');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => input += d);
process.stdin.on('end', async () => {
  if (config.visuals !== false) {
    sparkle('F472B6', 16, 1.8);
    setTimeout(() => borderGlow('8B5CF6', 5, 2.5), 200);
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
    if (summary) {
      line(gradient(`✦ ${summary}`, 'pink', 'purple'));
      await speak(summary, 'stop');
    }
  } catch (e) {}
});
