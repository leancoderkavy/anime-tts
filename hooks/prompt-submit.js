#!/usr/bin/env node
// Prompt submit — soft whoosh + TTS narrates what Claude is about to do

const { play, loadConfig } = require('./play');
const { flash } = require('./notify');
const { speak } = require('./tts');
const { loadEnv } = require('./env');
const https = require('https');

const config = loadConfig();
if (!config.enabled) process.exit(0);

play('prompt_submit');

if (config.visuals !== false) {
  flash('06B6D4', 0.25);
}

// Read user prompt from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => input += d);
process.stdin.on('end', async () => {
  const ttsConfig = config.tts || {};
  if (ttsConfig.enabled === false) return;
  const allowedEvents = ttsConfig.on_events || ['stop'];
  if (!allowedEvents.includes('prompt_submit')) return;

  let prompt = '';
  try {
    const data = JSON.parse(input);
    prompt = data.prompt || '';
  } catch (e) {}

  if (!prompt || prompt.length < 5) return;

  // Summarize the user's intent into a short action phrase
  const summary = summarizePrompt(prompt);
  if (summary) {
    await speak(summary, 'prompt_submit');
  }
});

// Quick local summarization of user prompt into a spoken action
function summarizePrompt(prompt) {
  let clean = prompt
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length < 5) return null;

  // Common command patterns
  if (/^\//.test(clean)) return `Running ${clean.split(' ')[0]}.`;

  // Extract the core ask — first sentence or clause, max 50 chars
  const first = clean.match(/^[^.!?\n]+/);
  let summary = first ? first[0].trim() : clean;

  if (summary.length > 50) {
    summary = summary.slice(0, 47).replace(/\s+\S*$/, '');
  }

  // Make it sound like a brief narration
  return summary + '.';
}
