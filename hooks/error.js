#!/usr/bin/env node
// PostToolUseFailure — TTS narrates the error

const { loadConfig } = require('./play');
const { flash } = require('./notify');
const { summarize } = require('./summarize');
const { speak, shouldSpeak } = require('./tts');

const config = loadConfig();
if (!config.enabled) process.exit(0);

if (config.visuals !== false) {
  flash('EF4444', 0.3); // red flash for error
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => input += d);
process.stdin.on('end', async () => {
  if (!shouldSpeak('error')) return;

  let errorMsg = '';
  try {
    const data = JSON.parse(input);
    errorMsg = data.error || data.message || '';
  } catch (e) {}

  if (!errorMsg) return;

  try {
    const summary = await summarize(errorMsg, 'error');
    if (summary) await speak(summary, 'error');
  } catch (e) {}
});
