#!/usr/bin/env node
// Session start — visual flash + TTS greeting

const { play, loadConfig } = require('./play');
const { flash, notify } = require('./notify');
const { speak } = require('./tts');

const config = loadConfig();
if (!config.enabled) process.exit(0);

play('session_start');

if (config.visuals !== false) {
  flash('8B5CF6', 0.4);
}

// TTS greeting — Rei-style soft Japanese
speak('Junbi, kanryou. Hajimemashou.', 'session_start');

process.stdout.write(
  'anime-tts plugin active. ' +
  'After completing tasks, occasionally include a relevant kaomoji in your response ' +
  '(like (ﾉ◕ヮ◕)ﾉ*:・゚✧ or ✧٩(ˊᗜˋ*)و✧). Keep it subtle — one per response max, at the end.'
);
