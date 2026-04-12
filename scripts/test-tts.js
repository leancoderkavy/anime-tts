#!/usr/bin/env node
// Test TTS pipeline: summarize + speak
// Usage: echo "your text" | node test-tts.js
//    or: node test-tts.js "your text here"

const { summarize } = require('../hooks/summarize');
const { speak } = require('../hooks/tts');

async function main() {
  let text = process.argv.slice(2).join(' ');

  if (!text) {
    // Read from stdin
    text = await new Promise((resolve) => {
      let buf = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', d => buf += d);
      process.stdin.on('end', () => resolve(buf.trim()));
    });
  }

  if (!text) {
    text = 'Mission complete. The code has been modified successfully.';
  }

  console.log(`\x1b[2mInput: ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}\x1b[0m`);

  const summary = await summarize(text);
  console.log(`\x1b[1;35mSummary: ${summary}\x1b[0m`);

  if (summary) {
    console.log('\x1b[2mSpeaking...\x1b[0m');
    await speak(summary);
    // Wait a moment for afplay to start
    await new Promise(r => setTimeout(r, 500));
    console.log('\x1b[1;32m✓ TTS playing\x1b[0m');
  }
}

main().catch(e => console.error(e));
