---
description: Design a custom TTS voice from a text prompt (ElevenLabs text-to-voice)
argument-hint: <voice description> | --list | --use <slug> | --remove <slug>
allowed-tools: Bash
---

# /anime-voice — Design a custom anime TTS voice

User input: `$ARGUMENTS`

You are helping the user create or manage a custom ElevenLabs voice for the anime-tts plugin.

## Routing

1. **No arguments** → explain usage and show current voices:
   - Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/create-voice.js --list`
   - Then tell the user: provide a vivid description (≥20 chars) covering **age, gender, accent, tone, mood, pacing**. Optional flags: `--name <slug>`, `--pick 1-3`, `--text "sample line"`, `--activate`.
   - Example: `/anime-voice young Japanese girl, bright cheerful anime voice, fast excited delivery, slight giggle --activate`

2. **Argument starts with `--list`** → run `node ${CLAUDE_PLUGIN_ROOT}/scripts/create-voice.js --list` and show output.

3. **Argument starts with `--use <slug>`** → run `node ${CLAUDE_PLUGIN_ROOT}/scripts/create-voice.js --use <slug>` and confirm activation.

4. **Argument starts with `--remove <slug>`** → confirm with the user first (destructive), then run `node ${CLAUDE_PLUGIN_ROOT}/scripts/create-voice.js --remove <slug>`.

5. **Plain description** (any other input) → this is a voice prompt:
   - If shorter than ~20 chars or vague, ask the user to enrich it (age, tone, accent, mood) before calling the API — don't waste credits.
   - Otherwise run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/create-voice.js "<description>" <forwarded flags>`
   - Forward any `--name`, `--pick`, `--text`, `--activate` flags the user passed.
   - On success, report the new voice slug + voice_id, and tell them how to activate it (`/anime-voice --use <slug>`) if they didn't pass `--activate`.

## Notes

- The script writes new voices into `config.json` under `tts.voices.<slug>`.
- Requires `ELEVENLABS_API_KEY` in the plugin's `.env` (already set if TTS is working).
- Each call to design a voice consumes ElevenLabs credits — generate previews sparingly.
- After activation, the next Stop/error/prompt event will use the new voice automatically.
