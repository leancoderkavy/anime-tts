// ANSI color helpers + direct-to-tty writer for anime decorations.
// Hook stdout isn't always rendered in the TUI; writing to /dev/tty
// guarantees the decoration shows up in the user's terminal.

const fs = require('fs');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function rgb(r, g, b) {
  return `\x1b[38;2;${r};${g};${b}m`;
}

function bg(r, g, b) {
  return `\x1b[48;2;${r};${g};${b}m`;
}

// Anime palette — vivid pastels
const PALETTE = {
  pink:    [244, 114, 182],
  rose:    [251, 113, 133],
  red:     [239, 68, 68],
  orange:  [251, 146, 60],
  yellow:  [250, 204, 21],
  lime:    [163, 230, 53],
  green:   [74, 222, 128],
  teal:    [45, 212, 191],
  cyan:    [103, 232, 249],
  blue:    [96, 165, 250],
  indigo:  [129, 140, 248],
  purple:  [167, 139, 250],
  violet:  [196, 181, 253],
  magenta: [232, 121, 249],
};

function color(name, text) {
  const c = PALETTE[name] || PALETTE.pink;
  return `${rgb(c[0], c[1], c[2])}${text}${RESET}`;
}

// Apply a smooth color gradient across the characters of a string
function gradient(text, fromName, toName) {
  const from = PALETTE[fromName] || PALETTE.pink;
  const to = PALETTE[toName] || PALETTE.cyan;
  const chars = [...text];
  if (chars.length <= 1) {
    return `${rgb(from[0], from[1], from[2])}${text}${RESET}`;
  }
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const t = i / (chars.length - 1);
    const r = Math.round(from[0] + (to[0] - from[0]) * t);
    const g = Math.round(from[1] + (to[1] - from[1]) * t);
    const b = Math.round(from[2] + (to[2] - from[2]) * t);
    out += `${rgb(r, g, b)}${chars[i]}`;
  }
  return out + RESET;
}

// Rainbow across full palette — cycles through anime hues
function rainbow(text) {
  const stops = ['pink', 'magenta', 'purple', 'indigo', 'cyan', 'teal', 'lime', 'yellow', 'orange', 'rose'];
  const chars = [...text];
  if (!chars.length) return text;
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const t = i / Math.max(1, chars.length - 1);
    const idx = t * (stops.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(stops.length - 1, lo + 1);
    const frac = idx - lo;
    const a = PALETTE[stops[lo]];
    const b = PALETTE[stops[hi]];
    const r = Math.round(a[0] + (b[0] - a[0]) * frac);
    const g = Math.round(a[1] + (b[1] - a[1]) * frac);
    const bb = Math.round(a[2] + (b[2] - a[2]) * frac);
    out += `${rgb(r, g, bb)}${chars[i]}`;
  }
  return out + RESET;
}

// Write directly to the controlling terminal so decorations always appear,
// regardless of how Claude Code routes hook stdout.
function writeTty(text) {
  try {
    fs.writeFileSync('/dev/tty', text);
  } catch (e) {
    // Fallback: stdout (will appear if hook captures it)
    try { process.stdout.write(text); } catch (_) {}
  }
}

function line(decoration) {
  writeTty(decoration + '\n');
}

module.exports = {
  RESET, BOLD, DIM,
  rgb, bg, color, gradient, rainbow,
  writeTty, line,
  PALETTE,
};
