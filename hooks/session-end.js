#!/usr/bin/env node
// Session end — farewell flash

const { loadConfig } = require('./play');
const { flash } = require('./notify');
const { speak, shouldSpeak } = require('./tts');

const config = loadConfig();
if (!config.enabled) process.exit(0);

if (config.visuals !== false) {
  flash('6366F1', 0.3); // indigo fade-out
}
