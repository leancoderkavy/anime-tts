#!/usr/bin/env node
// Generates subtle anime-style sounds to match a soft female anime voice
// Think: gentle chimes, soft sparkles, light bells, music box tones

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const soundsDir = path.join(__dirname, '..', 'sounds', 'custom');

function writeWav(filename, samples) {
  const numSamples = samples.length;
  const byteRate = SAMPLE_RATE * 2;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(soundsDir, filename), buffer);
  console.log(`  ${filename} (${(numSamples / SAMPLE_RATE).toFixed(2)}s)`);
}

const sin = (f, t) => Math.sin(2 * Math.PI * f * t);

// Soft exponential decay
const decay = (t, rate) => Math.exp(-t * rate);

// Gentle attack envelope
const env = (t, attack, hold, release) => {
  if (t < attack) return t / attack;
  if (t < attack + hold) return 1;
  const r = t - attack - hold;
  return Math.max(0, 1 - r / release);
};

// ─── SPARKLE CHIME (session start) ───
// Gentle ascending wind chime — soft bells with reverb tail
function generateSparkle() {
  const duration = 1.6;
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Float64Array(n);

  // Pentatonic chime notes: C6, D6, E6, G6, A6, C7
  const notes = [1047, 1175, 1319, 1568, 1760, 2093];
  const noteGap = 0.18;

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let v = 0;

    for (let j = 0; j < notes.length; j++) {
      const start = j * noteGap;
      if (t < start) continue;
      const nt = t - start;

      // Each bell: sine + soft overtone, gentle decay
      const amp = 0.12 * decay(nt, 3.5) * Math.min(1, nt / 0.005);
      v += amp * sin(notes[j], t);
      v += amp * 0.3 * sin(notes[j] * 2.0, t); // soft 2nd harmonic
      v += amp * 0.1 * sin(notes[j] * 3.0, t); // hint of 3rd
    }

    // Gentle reverb shimmer
    if (t > 0.8) {
      const tail = decay(t - 0.8, 2.5);
      v += 0.04 * tail * sin(2093, t);
      v += 0.03 * tail * sin(2093 * 1.498, t); // slightly detuned = shimmer
    }

    s[i] = v;
  }
  return s;
}

// ─── SOFT WHOOSH (prompt submit) ───
// Gentle breeze/air puff — filtered noise sweep
function generateWhoosh() {
  const duration = 0.4;
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Float64Array(n);

  // Simple low-pass filtered noise with pitch sweep
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const amp = env(t, 0.05, 0.1, 0.25) * 0.12;

    // Noise
    const noise = (Math.random() * 2 - 1);
    // Sweep cutoff from low to high and back
    const cutoff = 0.02 + 0.15 * Math.sin(Math.PI * t / duration);
    lp += cutoff * (noise - lp);

    // Add a very faint sine tone for warmth
    const tone = 0.04 * env(t, 0.03, 0.15, 0.2) * sin(880, t);

    s[i] = amp * lp + tone;
  }
  return s;
}

// ─── TINY PIP (pre-tool) ───
// Very quiet, single soft click/pip
function generatePip() {
  const duration = 0.08;
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const amp = 0.1 * decay(t, 40) * Math.min(1, t / 0.002);
    s[i] = amp * sin(2200, t) + amp * 0.4 * sin(3300, t);
  }
  return s;
}

// ─── BELL DING (post-tool) ───
// Single soft bell hit
function generateBell() {
  const duration = 0.35;
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const amp = 0.12 * decay(t, 5) * Math.min(1, t / 0.003);
    // Bell = fundamental + inharmonic partials
    s[i] = amp * sin(1397, t)           // F6
      + amp * 0.5 * sin(1397 * 2.0, t)
      + amp * 0.2 * sin(1397 * 2.83, t) // inharmonic = bell-like
      + amp * 0.1 * sin(1397 * 4.1, t);
  }
  return s;
}

// ─── MUSIC BOX (stop/completion) ───
// Gentle descending music box phrase — 3 notes resolving to tonic
function generateMusicBox() {
  const duration = 1.4;
  const n = Math.floor(SAMPLE_RATE * duration);
  const s = new Float64Array(n);

  // E6 → D6 → C6 (gentle resolve)
  const notes = [
    { freq: 1319, start: 0.0, dur: 0.4 },  // E6
    { freq: 1175, start: 0.35, dur: 0.4 },  // D6
    { freq: 1047, start: 0.7, dur: 0.7 },   // C6 (longer, resolves)
  ];

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let v = 0;

    for (const note of notes) {
      if (t < note.start) continue;
      const nt = t - note.start;
      if (nt > note.dur) continue;

      const amp = 0.13 * decay(nt, 3) * Math.min(1, nt / 0.003);
      // Music box timbre: bright fundamental + 2nd + slight 3rd
      v += amp * sin(note.freq, t);
      v += amp * 0.4 * sin(note.freq * 2, t);
      v += amp * 0.15 * sin(note.freq * 3, t);
    }

    // Soft reverb on final note
    if (t > 1.0) {
      const tail = decay(t - 1.0, 3);
      v += 0.03 * tail * sin(1047, t);
      v += 0.02 * tail * sin(1047 * 2, t);
    }

    s[i] = v;
  }
  return s;
}

// Generate
console.log('Generating subtle anime sounds...');
fs.mkdirSync(soundsDir, { recursive: true });
writeWav('power-up.wav', generateSparkle());
writeWav('energy-beam.wav', generateWhoosh());
writeWav('tool-activate.wav', generatePip());
writeWav('success-chime.wav', generateBell());
writeWav('completion.wav', generateMusicBox());
console.log('Done!');
