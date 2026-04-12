#!/usr/bin/env node
// Generate a custom TTS voice from a prompt via ElevenLabs text-to-voice.
// Flow: prompt → 3 previews → pick one (--pick N or first) → save voice.
//
// Usage:
//   node scripts/create-voice.js "<description>" [--name slug] [--pick 1-3] [--text "sample"] [--activate]
//   node scripts/create-voice.js --list
//   node scripts/create-voice.js --use <slug>
//   node scripts/create-voice.js --remove <slug>

const https = require('https');
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../hooks/env');

const PLUGIN_ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(PLUGIN_ROOT, 'config.json');

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n');
}

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { args.flags[key] = next; i++; }
      else args.flags[key] = true;
    } else {
      args._.push(a);
    }
  }
  return args;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'voice';
}

function request(opts, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: buf });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${buf.toString('utf8').slice(0, 400)}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function createPreviews(apiKey, description, sampleText) {
  const payload = JSON.stringify({
    voice_description: description,
    text: sampleText,
    auto_generate_text: false,
  });
  const { body } = await request({
    hostname: 'api.elevenlabs.io',
    path: '/v1/text-to-voice/create-previews',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      'Accept': 'application/json',
    },
  }, payload);
  return JSON.parse(body.toString('utf8'));
}

async function createVoiceFromPreview(apiKey, name, description, generatedVoiceId) {
  const payload = JSON.stringify({
    voice_name: name,
    voice_description: description,
    generated_voice_id: generatedVoiceId,
  });
  const { body } = await request({
    hostname: 'api.elevenlabs.io',
    path: '/v1/text-to-voice/create-voice-from-preview',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      'Accept': 'application/json',
    },
  }, payload);
  return JSON.parse(body.toString('utf8'));
}

function listVoices() {
  const cfg = loadConfig();
  const voices = (cfg.tts && cfg.tts.voices) || {};
  const active = cfg.tts && cfg.tts.voice_id;
  console.log('Available voices:');
  for (const [slug, v] of Object.entries(voices)) {
    const marker = v.id === active ? ' *' : '  ';
    console.log(`${marker} ${slug.padEnd(14)} ${v.id}  — ${v.description || ''}`);
  }
  console.log('\n* = currently active');
}

function useVoice(slug) {
  const cfg = loadConfig();
  const voices = (cfg.tts && cfg.tts.voices) || {};
  const v = voices[slug];
  if (!v) {
    console.error(`Voice "${slug}" not found. Run --list to see available voices.`);
    process.exit(1);
  }
  cfg.tts.voice_id = v.id;
  cfg.tts.persona = slug;
  saveConfig(cfg);
  console.log(`Active voice → ${slug} (${v.id})`);
}

function removeVoice(slug) {
  const cfg = loadConfig();
  const voices = (cfg.tts && cfg.tts.voices) || {};
  if (!voices[slug]) {
    console.error(`Voice "${slug}" not found.`);
    process.exit(1);
  }
  if (cfg.tts.voice_id === voices[slug].id) {
    console.error(`Cannot remove "${slug}" — currently active. Switch with --use first.`);
    process.exit(1);
  }
  delete voices[slug];
  saveConfig(cfg);
  console.log(`Removed voice "${slug}".`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.flags.list) return listVoices();
  if (args.flags.use) return useVoice(args.flags.use);
  if (args.flags.remove) return removeVoice(args.flags.remove);

  const description = args._.join(' ').trim();
  if (!description) {
    console.error('Usage: create-voice.js "<voice description>" [--name slug] [--pick 1-3] [--text "sample"] [--activate]');
    console.error('       create-voice.js --list | --use <slug> | --remove <slug>');
    process.exit(1);
  }
  if (description.length < 20) {
    console.error('Description must be at least 20 characters. Be specific about tone, accent, age, mood.');
    process.exit(1);
  }

  const env = loadEnv();
  const apiKey = env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('ELEVENLABS_API_KEY missing. Set it in .env or environment.');
    process.exit(1);
  }

  const sampleText = args.flags.text || 'Konnichiwa. Watashi wa anata no atarashii koe desu. Ganbatte kudasai, ne.';
  const pick = Math.max(1, Math.min(3, parseInt(args.flags.pick, 10) || 1));
  const name = args.flags.name ? slugify(args.flags.name) : slugify(description.split(/\s+/).slice(0, 3).join('-'));

  console.log(`Generating previews for: "${description}"`);
  const previewResp = await createPreviews(apiKey, description, sampleText);
  const previews = previewResp.previews || [];
  if (!previews.length) {
    console.error('No previews returned by API.');
    process.exit(1);
  }
  console.log(`Got ${previews.length} preview(s). Picking #${pick}.`);

  const chosen = previews[pick - 1] || previews[0];
  const generatedVoiceId = chosen.generated_voice_id;

  console.log(`Creating voice "${name}" from preview...`);
  const voiceResp = await createVoiceFromPreview(apiKey, name, description, generatedVoiceId);
  const voiceId = voiceResp.voice_id;
  if (!voiceId) {
    console.error('No voice_id returned.', voiceResp);
    process.exit(1);
  }

  const cfg = loadConfig();
  cfg.tts = cfg.tts || {};
  cfg.tts.voices = cfg.tts.voices || {};
  cfg.tts.voices[name] = { id: voiceId, description };
  if (args.flags.activate) {
    cfg.tts.voice_id = voiceId;
    cfg.tts.persona = name;
  }
  saveConfig(cfg);

  console.log(`\nSaved voice "${name}" → ${voiceId}`);
  if (args.flags.activate) console.log(`Activated as default.`);
  else console.log(`Activate with: node scripts/create-voice.js --use ${name}`);
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
