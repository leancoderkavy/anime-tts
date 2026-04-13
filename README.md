# anime-tts

[![GitHub stars](https://img.shields.io/github/stars/leancoderkavy/anime-tts?style=social)](https://github.com/leancoderkavy/anime-tts/stargazers)
[![npm version](https://img.shields.io/npm/v/anime-tts.svg)](https://www.npmjs.com/package/anime-tts)
[![npm downloads](https://img.shields.io/npm/dm/anime-tts.svg)](https://www.npmjs.com/package/anime-tts)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-8B5CF6)](https://claude.com/claude-code)

Anime TTS + terminal effects for [Claude Code](https://claude.com/claude-code). A breathy Rei Ayanami voiceover (ElevenLabs), sparkles, flashes, and sound FX on every session event.

> *"Junbi, kanryou. Hajimemashou."*

---

## Features

### Voice (ElevenLabs TTS)
- **10 curated anime voices** — Rei Ayanami (default), Sora, Akira, Yui, Yuki, Dylo, Itsuki, Aerisita, Megumin, Ritsuto
- **Design your own voice** via `/anime-voice` — text-to-voice, picks 3 previews, lets you name + activate
- **Japanese softeners** applied to spoken English (`Hai`, `Yatta`, `Dekita`, `Desu`, `Ne`) — 26 rotating phrases across stop/error/prompt-submit contexts
- **Local response summarization** — no extra LLM call, no Anthropic API key needed
- **Dedup + queue** — never overlapping speech, never repeats the same line within 30s
- **Disk cache** — rendered audio cached by `text + voice + settings` hash
- **Per-event opt-in** — choose which of `stop / error / session_start / prompt_submit` speak

### Visuals (native Swift binaries, macOS)
- **Flash** — full-screen color flash on session events (`bin/flash`)
- **Border glow** — animated border pulse (`bin/border-glow`)
- **Sparkles** — particle burst on session start (`bin/sparkle`)
- **Kaomoji reactions** — subtle (ﾉ◕ヮ◕)ﾉ*:・゚✧ in Claude's responses

### Sound FX
- **5 bundled chiptune sounds** — power-up, energy-beam, tool-activate, success-chime, completion
- **Themed sound packs** — default (chiptune), anime, silent
- **DBZ pack** — one-command setup from [free CC0 assets](https://heltonyan.itch.io/retroanimesfx)
- **Per-event overrides** — drop any `.wav` into `sounds/custom/` and map it to an event

### Plugin
- **Opt-in TTS** — ships disabled; `/anime-tts tts setup` walks you through key + voice + events
- **Three key providers** — slash command, `.env` file, or shell env var
- **macOS-only** (uses `afplay` + Swift binaries)

---

## Install

### Via Claude Code marketplace *(recommended)*

```
/plugin marketplace add leancoderkavy/anime-tts
/plugin install anime-tts@anime-tts
```

Update later with `/plugin marketplace update anime-tts`.

### Via npm

```sh
npm install -g anime-tts
```

### From source

```sh
git clone https://github.com/leancoderkavy/anime-tts.git ~/.claude/plugins/anime-tts
cd ~/.claude/plugins/anime-tts
cp .env.example .env   # then add your ElevenLabs key
```

Restart Claude Code, then run `/anime-tts tts setup` to enable voice.

---

## ElevenLabs API key

Get a free key at [elevenlabs.io](https://elevenlabs.io) → Profile → API Keys. Three ways to give it to the plugin (pick one):

1. **Slash command (easiest)**
   ```
   /anime-tts tts key sk_your_key_here
   ```
2. **`.env` file** — add to `~/.claude/plugins/anime-tts/.env`:
   ```
   ELEVENLABS_API_KEY=sk_your_key_here
   ```
3. **Shell export** — in `~/.zshrc` / `~/.bashrc`:
   ```sh
   export ELEVENLABS_API_KEY=sk_your_key_here
   ```

The plugin checks `.env` first, then falls back to `process.env`. Missing key → TTS silently no-ops (no error spam).

---

## Slash commands

### `/anime-tts` — Plugin manager

| Command | Effect |
|---|---|
| `/anime-tts` or `/anime-tts status` | Show current state (theme, voice, volume, events) |
| `/anime-tts on` / `off` | Master toggle for the entire plugin |
| `/anime-tts volume <0.0-1.0>` | Set SFX volume |
| `/anime-tts visuals <on\|off>` | Toggle terminal animations |
| `/anime-tts theme <name>` | Switch sound pack (`default`, `anime`, `silent`) |
| `/anime-tts sound <event> <path>` | Override a single sound file |
| `/anime-tts add-theme <name>` | Create a custom theme |
| `/anime-tts setup dbz` | Install the DBZ sound pack |

#### TTS subcommands

| Command | Effect |
|---|---|
| `/anime-tts tts setup` | First-run onboarding (key + voice + events) |
| `/anime-tts tts on` / `off` | Toggle voice narration |
| `/anime-tts tts key <sk_...>` | Save ElevenLabs API key to `.env` |
| `/anime-tts tts voice <name>` | Switch voice preset |
| `/anime-tts tts events <e1,e2,...>` | Pick which events speak |
| `/anime-tts tts volume <0.0-1.0>` | TTS-specific volume |
| `/anime-tts tts model <model_id>` | Switch ElevenLabs model |
| `/anime-tts tts test [text]` | Play a test line |

### `/anime-voice` — Design a custom voice

Text-to-voice via the ElevenLabs voice designer. Give a vivid description (age, gender, accent, tone, mood, pacing) and it generates three previews, lets you pick one, and adds it to your config.

```
/anime-voice young Japanese girl, bright cheerful anime voice, fast excited delivery
/anime-voice --list                    # show all your voices
/anime-voice --use <slug>              # activate a voice
/anime-voice --remove <slug>           # delete a voice
```

Flags: `--name <slug>`, `--pick <1-3>`, `--text "sample line"`, `--activate`.

> ⚠️ Each voice design call consumes ElevenLabs credits. Previews sparingly.

---

## Hook events

Fires on every [Claude Code hook](https://docs.claude.com/claude-code/hooks):

| Event | Visual | Sound | TTS (opt-in) |
|---|---|---|---|
| `SessionStart` | Flash + sparkles | `power-up.wav` | Greeting |
| `UserPromptSubmit` | — | `energy-beam.wav` | Intent narration |
| `PreToolUse` | — | `tool-activate.wav` | — |
| `PostToolUse` | — | `success-chime.wav` | — |
| `Stop` | Border glow | `completion.wav` | Response summary |
| `Notification` | — | Notification chime | — |
| `SessionEnd` | — | — | — |

---

## Voices

All voices are ElevenLabs professional voices. Switch with `/anime-tts tts voice <name>`.

| Name | Vibe | Gender | Language |
|---|---|---|---|
| **`rei`** | Rei Ayanami — soft breathy, quiet monotone *(default)* | F | Japanese |
| `sora` | Calm anime male protagonist | M | Japanese |
| `akira` | Charismatic anime male | M | Japanese |
| `yui` | Bright cute anime female | F | Japanese |
| `yuki` | Youthful calm teen female | F | Japanese |
| `dylo` | Dark fierce young male | M | English |
| `itsuki` | Energetic tomboy girl | F | Japanese |
| `aerisita` | Kawaii bubbly feminine | F | English |
| `megumin` | Theatrical chuunibyou explosion mage | F | English |
| `ritsuto` | Anime prince | M | Japanese |

### Voice settings

Tune how the voice sounds in `config.json` → `tts.voice_settings`:

```json
{
  "stability": 0.95,        // 0-1, higher = more monotone (Rei is 0.95)
  "similarity_boost": 0.85, // 0-1, voice fidelity
  "style": 0.05,            // 0-1, higher = more expressive
  "use_speaker_boost": true
}
```

---

## Configuration

`config.json` at the plugin root:

```json
{
  "enabled": true,
  "volume": 0.4,
  "visuals": true,
  "sfx": true,
  "tts": {
    "enabled": false,
    "voice_id": "3321Alera3fXjEWjjbAX",
    "model": "eleven_flash_v2_5",
    "language": "ja",
    "voice_settings": { "stability": 0.95, "similarity_boost": 0.85, "style": 0.05, "use_speaker_boost": true },
    "on_events": ["stop", "error", "session_start", "prompt_submit"],
    "voices": { "rei": { "id": "...", "description": "..." }, "...": {} }
  },
  "sounds": {
    "session_start": "generated/power-up.wav",
    "prompt_submit": "generated/energy-beam.wav",
    "pre_tool": "generated/tool-activate.wav",
    "post_tool": "generated/success-chime.wav",
    "stop": "generated/completion.wav"
  }
}
```

---

## Project layout

```
anime-tts/
├── .claude-plugin/
│   ├── plugin.json              # Claude Code plugin manifest (hooks)
│   └── marketplace.json         # Self-hosted plugin marketplace
├── bin/                         # Swift binaries (prebuilt for macOS)
│   ├── flash
│   ├── border-glow
│   └── sparkle
├── commands/
│   └── anime-voice.md           # /anime-voice slash command
├── hooks/                       # Node.js hook handlers
│   ├── session-start.js
│   ├── prompt-submit.js
│   ├── pre-tool.js / post-tool.js
│   ├── stop.js / error.js
│   ├── notification.js / session-end.js
│   ├── tts.js                   # ElevenLabs client + cache
│   ├── summarize.js             # Local response summarization + Rei-ify
│   ├── play.js / notify.js      # Audio + visual dispatch
│   ├── env.js                   # .env loader
│   └── ansi.js                  # Terminal color helpers
├── skills/anime-tts/SKILL.md    # /anime-tts slash command
├── scripts/
│   ├── create-voice.js          # ElevenLabs text-to-voice CLI
│   ├── test-tts.js
│   ├── generate-sounds.js       # Chiptune synth for default theme
│   ├── setup-dbz.js             # DBZ sound pack installer
│   ├── build-binaries.sh        # Rebuild Swift bins from source
│   └── *.swift                  # flash / border-glow / sparkle sources
├── sounds/generated/            # Bundled chiptune WAVs
├── config.json                  # Runtime config
└── .env                         # ELEVENLABS_API_KEY (gitignored)
```

---

## Star history

If this plugin sparks joy, [★ starring the repo](https://github.com/leancoderkavy/anime-tts/stargazers) helps others find it.

[![Star History Chart](https://api.star-history.com/svg?repos=leancoderkavy/anime-tts&type=Date)](https://star-history.com/#leancoderkavy/anime-tts&Date)

---

## License

MIT © leancoderkavy — see [LICENSE](LICENSE).

## Credits

- Default voice: **Akane** by ElevenLabs (soft breathy Japanese female)
- Sound packs: [Helton Yan — Retro Anime SFX](https://heltonyan.itch.io/retroanimesfx) (CC0)
- Built for [Claude Code](https://claude.com/claude-code)
