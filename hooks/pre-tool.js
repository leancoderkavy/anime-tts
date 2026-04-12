#!/usr/bin/env node
// Pre-tool — SFX only (skipped when sfx disabled)

const { play, loadConfig } = require('./play');

const config = loadConfig();
if (!config.enabled) process.exit(0);

play('pre_tool');
