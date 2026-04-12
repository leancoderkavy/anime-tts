// Native macOS visual effects using compiled Swift binaries
const { execFile } = require('child_process');
const path = require('path');

const BIN = path.join(__dirname, '..', 'bin');

// Brief screen flash effect
function flash(hexColor, duration) {
  execFile(path.join(BIN, 'flash'), [
    hexColor || '8B5CF6',
    String(duration || 0.4),
  ], () => {});
}

// Screen border glow that fades in then out
function borderGlow(hexColor, thickness, duration) {
  execFile(path.join(BIN, 'border-glow'), [
    hexColor || '8B5CF6',
    String(thickness || 4),
    String(duration || 2.5),
  ], () => {});
}

// macOS notification banner
function notify(title, message) {
  const escaped = (s) => (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  execFile('osascript', ['-e',
    `display notification "${escaped(message)}" with title "${escaped(title)}"`
  ], () => {});
}

module.exports = { flash, borderGlow, notify };
