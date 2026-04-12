#!/usr/bin/env node
// Post-tool — SFX only for heavy tools (skipped when sfx disabled)

const { play, loadConfig } = require('./play');

const config = loadConfig();
if (!config.enabled) process.exit(0);

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => input += d);
process.stdin.on('end', () => {
  let toolName = '';
  try { toolName = JSON.parse(input).tool_name || ''; } catch (e) {}

  const quietTools = new Set(['Read', 'Grep', 'Glob']);
  if (quietTools.has(toolName)) return;

  play('post_tool');
});
