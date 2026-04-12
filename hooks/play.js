// Shared sound player — reads config.json, resolves sound path, plays via afplay
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PLUGIN_ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(PLUGIN_ROOT, 'config.json');
const SOUNDS_DIR = path.join(PLUGIN_ROOT, 'sounds');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    return { enabled: true, volume: 0.8, sounds: {}, visuals: true };
  }
}

function play(eventName) {
  const config = loadConfig();
  if (!config.enabled) return;
  if (config.sfx === false) return;

  const soundFile = config.sounds[eventName];
  if (!soundFile) return;

  const fullPath = path.join(SOUNDS_DIR, soundFile);
  if (!fs.existsSync(fullPath)) {
    // Fallback to generated if custom not found
    const fallback = path.join(SOUNDS_DIR, 'generated', path.basename(soundFile));
    if (fs.existsSync(fallback)) {
      doPlay(fallback, config.volume);
    }
    return;
  }

  doPlay(fullPath, config.volume);
}

function doPlay(filePath, volume) {
  // afplay -v takes 0-1 range (actually 0-255 but normalized)
  const vol = String(Math.max(0, Math.min(1, volume || 0.8)));
  execFile('afplay', ['-v', vol, filePath], () => {});
}

function shouldShowVisuals() {
  const config = loadConfig();
  return config.enabled !== false && config.visuals !== false;
}

module.exports = { play, loadConfig, shouldShowVisuals, PLUGIN_ROOT, SOUNDS_DIR };
