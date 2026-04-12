---
name: anime-tts
description: Manage anime TTS + effects — change themes, swap sounds, toggle on/off, adjust volume, configure TTS narration
user-invocable: true
argument-hint: "[status|theme|sound|volume|visuals|tts|setup] [args...]"
allowed-tools:
  - Read
  - Edit
  - Bash
---

# anime-tts Plugin Manager

Config file: `${CLAUDE_PLUGIN_ROOT}/config.json`
Env file: `${CLAUDE_PLUGIN_ROOT}/.env`
Sounds dir: `${CLAUDE_PLUGIN_ROOT}/sounds/`

## Commands

### `/anime-tts` or `/anime-tts status`
Read config.json and show current state: theme, enabled, volume, visuals, TTS state, voice name, which sound file is mapped to each event. List available themes and voices.

### `/anime-tts theme <name>`
Switch theme. Read config.json, find the theme in `themes`, copy its sound mappings into `sounds`, set `theme` field. Available themes: `default` (chiptune synth), `anime` (CC0 OpenGameArt sounds), `silent` (visuals only). Save config.

### `/anime-tts sound <event> <path>`
Override a single sound. Events: `session_start`, `prompt_submit`, `pre_tool`, `post_tool`, `stop`.
- If `<path>` is an absolute path or URL, copy it to `sounds/custom/` and update config.
- If `<path>` is "default", revert that event to the current theme's default.
- If `<path>` is "off", set that event's sound to null.
Show the user how to preview: `afplay ~/Coding/anime-tts-plugin/sounds/custom/<file>.wav`

### `/anime-tts volume <0.0-1.0>`
Set volume in config.json. Validate range 0.0 to 1.0.

### `/anime-tts visuals <on|off>`
Toggle terminal visual animations (sparkles, beams, etc.) independent of sound.

### `/anime-tts on` / `/anime-tts off`
Toggle `enabled` in config. When off, all hooks skip sound, visuals, and TTS.

### `/anime-tts tts <on|off>`
Toggle TTS narration. When on, Claude's response is summarized locally (or via Haiku if `ANTHROPIC_API_KEY` is set) and spoken aloud via ElevenLabs when Claude finishes responding.

TTS ships **disabled by default** — users must run `/anime-tts tts setup` (or manually provide an API key + enable) before hearing anything.

### `/anime-tts tts setup`
First-run onboarding. Walk the user through enabling TTS:
1. Check if `ELEVENLABS_API_KEY` is set (env var or `.env`). If missing, prompt: "Paste your ElevenLabs API key (get one at https://elevenlabs.io). I'll write it to `.env`." Then call `/anime-tts tts key <pasted>`.
2. Ask which voice they want. Show the list from `/anime-tts tts voice`. Default suggestion: `rei`.
3. Ask which events should speak. Default: `["stop", "error"]` only (quiet). Offer to add `session_start` and `prompt_submit` for more chatter.
4. Set `tts.enabled = true` in config.json.
5. Run `/anime-tts tts test` to verify.

### `/anime-tts tts key <api_key>`
Write the provided ElevenLabs API key to `.env` (create the file if missing, update the `ELEVENLABS_API_KEY=` line if present). Never echo the key back to the user — confirm with `Key saved (sk_****...****)`. If the user passes no key, tell them the three ways to provide one:
- Run `/anime-tts tts key sk_your_key_here`
- Add `ELEVENLABS_API_KEY=sk_your_key_here` to `~/Coding/anime-tts-plugin/.env`
- Export in shell: `export ELEVENLABS_API_KEY=sk_your_key_here`

### `/anime-tts tts events <event1,event2,...>`
Set which events trigger TTS. Valid: `stop`, `error`, `session_start`, `prompt_submit`. Update `tts.on_events` in config.json.

### `/anime-tts tts voice <name>`
Switch TTS voice. Available voices from config.json `tts.voices`:
- `rei` — Rei Ayanami, soft breathy Japanese female, quiet monotone (default)
- `sora` — Calm Japanese anime male protagonist
- `akira` — Charismatic Japanese male
- `yui` — Bright cute Japanese female
- `yuki` — Youthful calm anime teen female
- `dylo` — Dark fierce young male
- `itsuki` — Energetic tomboyish anime girl
- `aerisita` — Kawaii bubbly feminine
- `megumin` — Theatrical chuunibyou explosion mage
- `ritsuto` — Anime prince
Update `tts.voice_id` in config.json to the selected voice's ID.

### `/anime-tts tts volume <0.0-1.0>`
Set TTS-specific volume in config.json `tts.volume`.

### `/anime-tts tts model <model_id>`
Switch ElevenLabs model. Options: `eleven_flash_v2_5` (fast, default), `eleven_multilingual_v2` (higher quality), `eleven_turbo_v2_5` (fastest).

### `/anime-tts tts test [text]`
Test TTS by running: `echo '<text>' | node ~/Coding/anime-tts-plugin/scripts/test-tts.js`
If no text given, use "Mission complete. The code has been modified successfully."

### `/anime-tts setup dbz`
Run the DBZ setup script. Tell the user:
1. Download the free pack from https://heltonyan.itch.io/retroanimesfx
2. Unzip it
3. Then run: `node ~/Coding/anime-tts-plugin/scripts/setup-dbz.js /path/to/unzipped/folder`

### `/anime-tts add-theme <name>`
Create a new custom theme. Ask which WAV files to use for each event. Add it to `themes` in config.json.

## Environment keys
- `ELEVENLABS_API_KEY` — stored in `.env`, required for TTS
- `ANTHROPIC_API_KEY` — optional in `.env`, enables Haiku summarization (falls back to local text extraction)

## Response format
After making changes, show a compact summary table of the new state. Include preview commands for any changed sounds.
