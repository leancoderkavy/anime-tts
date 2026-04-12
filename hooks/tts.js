// ElevenLabs Text-to-Speech module
// Features: dedup, queue (no overlapping speech), caching

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execFile, execSync } = require('child_process');
const { loadEnv } = require('./env');
const { loadConfig, PLUGIN_ROOT } = require('./play');

const CACHE_DIR = path.join(PLUGIN_ROOT, 'tts-cache');
const LOCK_FILE = path.join(CACHE_DIR, '.speaking');
const LAST_FILE = path.join(CACHE_DIR, '.last-text');
const DEFAULT_VOICE_ID = '3321Alera3fXjEWjjbAX'; // Akane — Rei Ayanami: soft breathy Japanese female
const DEFAULT_VOICE_SETTINGS = {
  stability: 0.95,        // near-flat monotone (Rei)
  similarity_boost: 0.85,
  style: 0.05,            // restrained, no theatrics
  use_speaker_boost: true,
};

// ──────────────────────────────────────────────
// Dedup: skip if same text was just spoken
// ──────────────────────────────────────────────

function isDuplicate(text) {
  try {
    const stat = fs.statSync(LAST_FILE);
    const ageMs = Date.now() - stat.mtimeMs;
    if (ageMs > 30000) return false; // older than 30s, not a dupe
    const last = fs.readFileSync(LAST_FILE, 'utf8');
    return last === text;
  } catch (e) {
    return false;
  }
}

function recordSpoken(text) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(LAST_FILE, text);
  } catch (e) {}
}

// ──────────────────────────────────────────────
// Queue: only one TTS at a time, skip if busy
// ──────────────────────────────────────────────

function isSpeaking() {
  try {
    const stat = fs.statSync(LOCK_FILE);
    const ageMs = Date.now() - stat.mtimeMs;
    // Lock older than 15s is stale
    if (ageMs > 15000) {
      fs.unlinkSync(LOCK_FILE);
      return false;
    }
    // Check if afplay is actually running
    try {
      execSync('pgrep -x afplay', { stdio: 'ignore' });
      return true; // afplay is running
    } catch (e) {
      // No afplay process, lock is stale
      fs.unlinkSync(LOCK_FILE);
      return false;
    }
  } catch (e) {
    return false;
  }
}

function lockSpeaking() {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(LOCK_FILE, String(Date.now()));
  } catch (e) {}
}

function unlockSpeaking() {
  try { fs.unlinkSync(LOCK_FILE); } catch (e) {}
}

// ──────────────────────────────────────────────
// Check if TTS should fire for a given event
// ──────────────────────────────────────────────

function shouldSpeak(event) {
  const config = loadConfig();
  const ttsConfig = config.tts || {};
  if (!config.enabled || ttsConfig.enabled === false) return false;
  const allowedEvents = ttsConfig.on_events || ['stop'];
  return allowedEvents.includes(event);
}

// ──────────────────────────────────────────────
// Main speak function
// ──────────────────────────────────────────────

function speak(text, event) {
  return new Promise((resolve) => {
    if (!text || text.length < 3) {
      resolve();
      return;
    }

    // Dedup check
    if (isDuplicate(text)) {
      resolve();
      return;
    }

    // Queue check — skip if already speaking
    if (isSpeaking()) {
      resolve();
      return;
    }

    const env = loadEnv();
    const config = loadConfig();
    const apiKey = env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      resolve();
      return;
    }

    const ttsConfig = config.tts || {};
    if (ttsConfig.enabled === false) {
      resolve();
      return;
    }

    if (event) {
      const allowedEvents = ttsConfig.on_events || ['stop'];
      if (!allowedEvents.includes(event)) {
        resolve();
        return;
      }
    }

    const voiceId = ttsConfig.voice_id || DEFAULT_VOICE_ID;
    const model = ttsConfig.model || 'eleven_flash_v2_5';
    const volume = ttsConfig.volume != null ? ttsConfig.volume : (config.volume || 0.8);

    fs.mkdirSync(CACHE_DIR, { recursive: true });

    const voiceSettingsForHash = { ...DEFAULT_VOICE_SETTINGS, ...(ttsConfig.voice_settings || {}) };
    const langForHash = ttsConfig.language || ttsConfig.language_code || '';
    const hashInput = text + '|' + voiceId + '|' + model + '|' + langForHash + '|' + JSON.stringify(voiceSettingsForHash);
    const hash = Buffer.from(hashInput).toString('base64url').slice(0, 40);
    const cachePath = path.join(CACHE_DIR, `${hash}.mp3`);

    if (fs.existsSync(cachePath)) {
      lockSpeaking();
      recordSpoken(text);
      playAudio(cachePath, volume, () => unlockSpeaking());
      resolve();
      return;
    }

    const voiceSettings = { ...DEFAULT_VOICE_SETTINGS, ...(ttsConfig.voice_settings || {}) };
    const languageCode = ttsConfig.language || ttsConfig.language_code;

    const payload = {
      text: text,
      model_id: model,
      voice_settings: voiceSettings,
    };
    if (languageCode) payload.language_code = languageCode;
    const body = JSON.stringify(payload);

    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${voiceId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        'Accept': 'audio/mpeg',
      },
      timeout: 10000,
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        resolve();
        return;
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const audioBuffer = Buffer.concat(chunks);
        fs.writeFileSync(cachePath, audioBuffer);
        lockSpeaking();
        recordSpoken(text);
        playAudio(cachePath, volume, () => unlockSpeaking());
        resolve();
      });
    });

    req.on('error', () => resolve());
    req.on('timeout', () => { req.destroy(); resolve(); });
    req.write(body);
    req.end();
  });
}

function playAudio(filePath, volume, onDone) {
  const vol = String(Math.max(0, Math.min(1, volume || 0.8)));
  execFile('afplay', ['-v', vol, filePath], () => {
    if (onDone) onDone();
  });
}

module.exports = { speak, shouldSpeak };
