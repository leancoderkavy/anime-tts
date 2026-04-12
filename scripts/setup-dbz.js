#!/usr/bin/env node
// Setup script for the Helton Yan Retro Anime SFX pack
//
// Usage:
//   node setup-dbz.js /path/to/downloaded/pack
//
// The pack from itch.io contains "sausage files" (long WAV files with multiple
// sounds concatenated). This script scans the pack directory for WAV files and
// lets you pick which ones to use for each event, or auto-assigns sensible
// defaults based on filename keywords.
//
// Download the pack from: https://heltonyan.itch.io/retroanimesfx

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PLUGIN_ROOT = path.join(__dirname, '..');
const CUSTOM_DIR = path.join(PLUGIN_ROOT, 'sounds', 'custom');
const CONFIG_PATH = path.join(PLUGIN_ROOT, 'config.json');

const packDir = process.argv[2];

if (!packDir) {
  console.log(`
\x1b[1;35m━━━ anime-tts: DBZ Sound Pack Setup ━━━\x1b[0m

\x1b[1mStep 1:\x1b[0m Download the free pack from:
  \x1b[36mhttps://heltonyan.itch.io/retroanimesfx\x1b[0m

\x1b[1mStep 2:\x1b[0m Unzip it somewhere, then run:
  \x1b[33mnode scripts/setup-dbz.js /path/to/unzipped/folder\x1b[0m

\x1b[1mStep 3:\x1b[0m The script will scan for WAV files and copy the best
  matches into sounds/custom/

\x1b[2mAlternatively, manually place WAV files in sounds/custom/ with these names:
  power-up.wav, energy-beam.wav, tool-activate.wav,
  success-chime.wav, completion.wav\x1b[0m
`);
  process.exit(0);
}

// Resolve and validate pack directory
const resolvedPack = path.resolve(packDir);
if (!fs.existsSync(resolvedPack)) {
  console.error(`\x1b[31mError: Directory not found: ${resolvedPack}\x1b[0m`);
  process.exit(1);
}

// Recursively find all WAV files
function findWavs(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findWavs(full));
    } else if (entry.name.toLowerCase().endsWith('.wav')) {
      results.push(full);
    }
  }
  return results;
}

console.log(`\x1b[1;35m━━━ Scanning ${resolvedPack} for WAV files... ━━━\x1b[0m\n`);
const wavFiles = findWavs(resolvedPack);

if (wavFiles.length === 0) {
  console.error('\x1b[31mNo WAV files found in that directory.\x1b[0m');
  console.log('Make sure you unzipped the download first.');
  process.exit(1);
}

console.log(`Found \x1b[1m${wavFiles.length}\x1b[0m WAV files.\n`);

// Keyword matching for auto-assignment
const eventKeywords = {
  'power-up': ['power', 'charge', 'transform', 'aura', 'ki_charge', 'startup', 'rise', 'ascend', 'level'],
  'energy-beam': ['beam', 'blast', 'kamehame', 'attack', 'fire', 'shoot', 'launch', 'energy', 'wave'],
  'tool-activate': ['blip', 'click', 'select', 'activate', 'beep', 'ui', 'menu', 'cursor', 'tick'],
  'success-chime': ['chime', 'success', 'win', 'correct', 'ding', 'coin', 'pickup', 'collect', 'item'],
  'completion': ['complete', 'victory', 'fanfare', 'finish', 'end', 'resolve', 'clear', 'stage'],
};

// Score each WAV against each event
function scoreFile(filePath, keywords) {
  const name = path.basename(filePath).toLowerCase();
  const dirName = path.dirname(filePath).toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (name.includes(kw)) score += 3;
    if (dirName.includes(kw)) score += 1;
  }
  return score;
}

// Get WAV duration using afinfo (macOS)
function getDuration(filePath) {
  try {
    const out = execSync(`afinfo "${filePath}" 2>/dev/null | grep duration`, { encoding: 'utf8' });
    const match = out.match(/([\d.]+)\s*sec/);
    return match ? parseFloat(match[1]) : null;
  } catch (e) {
    return null;
  }
}

// Preferred duration ranges per event
const durationPrefs = {
  'power-up': { min: 0.5, max: 3.0, ideal: 1.5 },
  'energy-beam': { min: 0.2, max: 1.5, ideal: 0.6 },
  'tool-activate': { min: 0.05, max: 0.5, ideal: 0.15 },
  'success-chime': { min: 0.1, max: 0.8, ideal: 0.3 },
  'completion': { min: 0.5, max: 2.5, ideal: 1.2 },
};

fs.mkdirSync(CUSTOM_DIR, { recursive: true });

const assignments = {};

for (const [eventName, keywords] of Object.entries(eventKeywords)) {
  // Score all files
  let scored = wavFiles.map(f => ({
    path: f,
    name: path.basename(f),
    score: scoreFile(f, keywords),
  }));

  // Filter to files with at least some keyword match
  let candidates = scored.filter(s => s.score > 0);

  // If no keyword matches, try duration-based selection
  if (candidates.length === 0) {
    candidates = scored;
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Take top 10, check durations
  const top = candidates.slice(0, 10);
  const prefs = durationPrefs[eventName];
  let best = null;
  let bestDist = Infinity;

  for (const c of top) {
    const dur = getDuration(c.path);
    if (dur !== null) {
      // Must be in range
      if (dur >= prefs.min && dur <= prefs.max) {
        const dist = Math.abs(dur - prefs.ideal);
        if (dist < bestDist) {
          bestDist = dist;
          best = { ...c, duration: dur };
        }
      }
    } else if (!best) {
      // Can't check duration, use keyword score
      best = c;
    }
  }

  // Fallback to first candidate
  if (!best && candidates.length > 0) {
    best = candidates[0];
  }

  if (best) {
    const destName = `${eventName}.wav`;
    const destPath = path.join(CUSTOM_DIR, destName);
    fs.copyFileSync(best.path, destPath);
    assignments[eventName] = {
      source: best.name,
      duration: best.duration || '?',
      score: best.score,
    };
    console.log(`\x1b[1;32m✓\x1b[0m ${eventName.padEnd(16)} ← \x1b[36m${best.name}\x1b[0m (score: ${best.score}, dur: ${best.duration || '?'}s)`);
  } else {
    console.log(`\x1b[1;33m⚠\x1b[0m ${eventName.padEnd(16)} ← \x1b[2mno match found, using generated fallback\x1b[0m`);
  }
}

// Update config to use dbz theme
try {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  config.theme = 'dbz';
  config.sounds = {
    session_start: fs.existsSync(path.join(CUSTOM_DIR, 'power-up.wav')) ? 'custom/power-up.wav' : 'generated/power-up.wav',
    prompt_submit: fs.existsSync(path.join(CUSTOM_DIR, 'energy-beam.wav')) ? 'custom/energy-beam.wav' : 'generated/energy-beam.wav',
    pre_tool: fs.existsSync(path.join(CUSTOM_DIR, 'tool-activate.wav')) ? 'custom/tool-activate.wav' : 'generated/tool-activate.wav',
    post_tool: fs.existsSync(path.join(CUSTOM_DIR, 'success-chime.wav')) ? 'custom/success-chime.wav' : 'generated/success-chime.wav',
    stop: fs.existsSync(path.join(CUSTOM_DIR, 'completion.wav')) ? 'custom/completion.wav' : 'generated/completion.wav',
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
  console.log(`\n\x1b[1;35m━━━ Config updated to DBZ theme ━━━\x1b[0m`);
} catch (e) {
  console.error(`\x1b[31mWarning: Could not update config.json: ${e.message}\x1b[0m`);
}

console.log(`
\x1b[2mTo preview a sound:\x1b[0m  afplay sounds/custom/power-up.wav
\x1b[2mTo swap a sound:\x1b[0m     cp /path/to/your.wav sounds/custom/energy-beam.wav
\x1b[2mTo revert to synth:\x1b[0m  use /anime-tts theme default
`);
