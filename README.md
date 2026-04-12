# anime-fx

Anime-style terminal effects for [Claude Code](https://claude.com/claude-code). Sparkles, kaomoji reactions, sound FX, and a breathy Rei Ayanami voiceover on every session event.

## Features

- **Visual FX** — terminal flash + border glow on session start, tool use, completion
- **Sound FX** — themed sound packs (default chiptune, anime, DBZ, silent)
- **TTS narration** — ElevenLabs speech on stop / error / prompt / session-start, with local response summarization (no LLM round-trip required)
- **Rei voice by default** — soft breathy Japanese female (Akane, `3321Alera3fXjEWjjbAX`), monotone cadence, Japanese softeners sprinkled into English output (`desu`, `hai`, `ne`)
- **10+ voice presets** — cute kawaii, anime prince, tomboy, explosion mage, and more
- **Dedup + queue** — never overlapping speech, never repeats the same line twice in 30s
- **Audio caching** — each rendered line is cached on disk by text + voice + settings hash
- **Slash command** — `/anime-fx` to toggle, swap themes, change voice, set volume

## Install

### From Claude Code marketplace

```
/plugin install anime-fx
```

### From npm

```sh
npm install -g anime-fx
anime-fx install     # copies plugin into ~/.claude/plugins/anime-fx
```

### From source

```sh
git clone https://github.com/kavydev/anime-fx-plugin.git ~/.claude/plugins/anime-fx
cd ~/.claude/plugins/anime-fx
cp .env.example .env
# add ELEVENLABS_API_KEY to .env
```

Restart Claude Code. Then enable TTS with `/anime-fx tts setup` — it will walk you through pasting your ElevenLabs key, picking a voice, and choosing which events speak.

> TTS is **disabled by default**. Visuals and sound FX work immediately; voice requires explicit opt-in.

## ElevenLabs API key

You need a free ElevenLabs account — [sign up here](https://elevenlabs.io), then find your key in Profile → API Keys. Three ways to give it to the plugin (pick one):

1. **Slash command (easiest)**: `/anime-fx tts key sk_your_key_here` — writes it to `.env` for you
2. **Edit `.env` directly**: add `ELEVENLABS_API_KEY=sk_your_key_here` to `~/.claude/plugins/anime-fx/.env`
3. **Shell export**: `export ELEVENLABS_API_KEY=sk_your_key_here` in your `~/.zshrc` or `~/.bashrc`

The plugin checks `.env` first, then falls back to `process.env`, so either mechanism works.

## Configuration

Edit `config.json`:

```json
{
  "enabled": true,
  "volume": 0.4,
  "visuals": true,
  "sfx": true,
  "tts": {
    "enabled": true,
    "voice_id": "3321Alera3fXjEWjjbAX",
    "model": "eleven_flash_v2_5",
    "language": "ja",
    "voice_settings": {
      "stability": 0.95,
      "similarity_boost": 0.85,
      "style": 0.05,
      "use_speaker_boost": true
    },
    "on_events": ["stop", "error", "session_start", "prompt_submit"]
  }
}
```

### Environment

Put your ElevenLabs API key in `.env`:

```
ELEVENLABS_API_KEY=sk_...
```

Get one at [elevenlabs.io](https://elevenlabs.io).

## Slash commands

| Command | Effect |
|---|---|
| `/anime-fx` | Show current state |
| `/anime-fx on` / `off` | Master toggle |
| `/anime-fx volume 0.5` | Set SFX volume |
| `/anime-fx visuals off` | Disable terminal animations |
| `/anime-fx tts on` / `off` | Toggle voice |
| `/anime-fx tts voice rei` | Swap voice preset |
| `/anime-fx tts test` | Test current voice |
| `/anime-fx theme anime` | Switch sound pack |

## Voices

All voices are ElevenLabs professional voices. Switch with `/anime-fx tts voice <name>`.

| Name | Vibe |
|---|---|
| `rei` | Rei Ayanami — soft breathy Japanese female, quiet monotone *(default)* |
| `sora` | Calm Japanese anime male protagonist |
| `akira` | Charismatic Japanese male |
| `yui` | Bright cute Japanese female |
| `yuki` | Youthful calm anime teen female |
| `dylo` | Dark fierce young male |
| `itsuki` | Energetic tomboyish anime girl |
| `aerisita` | Kawaii bubbly feminine |
| `megumin` | Theatrical chuunibyou explosion mage |
| `ritsuto` | Anime prince |

## Hooks

Fires on every Claude Code [hook event](https://docs.claude.com/claude-code/hooks):

- `SessionStart` — power-up sound, flash, TTS greeting
- `UserPromptSubmit` — energy beam SFX, intent narration
- `PreToolUse` / `PostToolUse` — tool activation chimes
- `Stop` — completion SFX, Rei summarizes the response
- `Notification` / `SessionEnd` — ambient feedback

## License

MIT © kavydev

## Credits

- Voice: [Akane](https://elevenlabs.io) by ElevenLabs
- Sound packs: [Helton Yan — Retro Anime SFX](https://heltonyan.itch.io/retroanimesfx) (CC0)
- Built for [Claude Code](https://claude.com/claude-code)
