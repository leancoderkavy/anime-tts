---
description: Show / hide the floating panel of Claude Code sessions awaiting your attention
argument-hint: show | hide | toggle | status | list
allowed-tools: Bash
---

# /sessions — Sessions awaiting your attention

User input: `$ARGUMENTS`

Manage the floating panel that shows which Claude Code tabs/windows have **finished a turn and are waiting for the user**. The panel is a floating macOS NSPanel pinned top-right; click any row to dismiss it.

## How it works

- Every time a Claude Code session finishes a turn (Stop event), the anime-tts plugin records it in `~/.claude/anime-tts-attention.json`.
- When the user submits a new prompt in that session, the entry is cleared automatically.
- The panel reads this file every second and displays the awaiting sessions with project name, age, and summary.

## Routing the argument

1. **No argument or `toggle`** → run:
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/sessions-panel.js toggle`

2. **`show`** → run:
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/sessions-panel.js show`
   Then tell the user the panel is in the top-right of their screen and they can drag it.

3. **`hide`** → run:
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/sessions-panel.js hide`

4. **`status`** → run:
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/sessions-panel.js status`

5. **`list`** → run:
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/sessions-panel.js list`
   Use this when the user wants the list inline (no floating window).

## Notes

- The panel daemon's PID is stored at `~/.claude/anime-tts-panel.pid`.
- Logs at `~/.claude/anime-tts-panel.log` if anything goes wrong.
- If the binary is missing, run `${CLAUDE_PLUGIN_ROOT}/scripts/build-binaries.sh` to recompile.
