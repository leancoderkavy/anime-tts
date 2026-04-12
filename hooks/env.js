// Load .env file from plugin root
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

function loadEnv() {
  const env = {};
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      env[key] = val;
    }
  } catch (e) {}
  return env;
}

module.exports = { loadEnv };
