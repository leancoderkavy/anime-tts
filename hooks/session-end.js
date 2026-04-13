#!/usr/bin/env node
// Session end — farewell flash

const { loadConfig } = require('./play');
const { flash, sparkle } = require('./notify');
const { speak, shouldSpeak } = require('./tts');

const config = loadConfig();
if (!config.enabled) process.exit(0);

if (config.visuals !== false) {
  flash('6366F1', 0.4); // indigo triple-pulse fade-out
  setTimeout(() => sparkle('C7D2FE', 12, 2.0), 100);
}
