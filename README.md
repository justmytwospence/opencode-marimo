# opencode-marimo

An [opencode](https://opencode.ai) plugin that follows the [marimo](https://marimo.io) notebook open
under your project, so the agent knows what it looks like and what it is doing without being asked.
The port of [pi-marimo](https://github.com/justmytwospence/pi-marimo); `src/core` is shared with it
unchanged.

- **Prompt line (TUI):** `marimo fit.py · 1 error`, and while a cell runs,
  `marimo ▸ Model fit 12s · 1 error`: the markdown section the running cell sits under (the whole
  heading path when it is short, else the deepest heading), so you can tell roughly what is running.
- **Context (server):** when you send a prompt, the notebook's state is taken once and placed
  right after that prompt for every model request of the turn: its outline (markdown headings), one
  line per code cell with what it defines, and what needs attention (running, queued, errors,
  stale, edited but not rerun, changed by you in the browser since the agent last went idle). It is
  added in `experimental.chat.messages.transform` and never stored, so old copies never pile up.
  It does not change during the turn on purpose: Anthropic drops a thinking block when anything
  before it changes, so a block refreshed on every request would cost the model its reasoning from
  the previous step. At the next prompt the old copy goes, which drops that earlier turn's thinking
  once and re-reads the turn after it uncached once.

It pairs with the [marimo-pair](https://github.com/marimo-team/marimo-pair) skill, which is how the
agent inspects and changes the notebook; this plugin only reads.

## How it works

Both halves subscribe to the notebook session's `/sse` stream as a marimo *kiosk* consumer: a
read-only viewer that cannot run or edit code and never takes the notebook over from your browser.
marimo replays the session on connect, then streams the cell document, each cell's status and errors,
and the dataflow graph. Outputs are dropped and nothing runs in the kernel. See pi-marimo's README for
the details (browser edits, sessions sharing a file).

It follows every notebook open under the project directory (up to eight, leaving out hidden
directories such as `.worktrees/`), found through marimo's server registry (servers started with
`--no-token` register themselves). The current one, shown beside the prompt (`+2` counts the others)
and in context, is the one used most recently: a running cell first, then the latest cell run or
edit. Set `MARIMO_NOTEBOOK=/path/to/notebook.py` to pin one (or `off` to disable the plugin).
Token-protected servers are reached with `MARIMO_TOKEN`.

## Install

The server and TUI halves are two exports of one package. Pin the same commit in both configs:

```jsonc
// opencode.jsonc
"plugin": ["opencode-marimo@github:justmytwospence/opencode-marimo#<commit>"]

// tui.jsonc
"plugin": ["opencode-marimo@github:justmytwospence/opencode-marimo#<commit>"]
```

opencode compiles `src/tui.tsx` (Solid JSX) itself, so there is no build step. Tested with
opencode 1.18.29.

## Development

```sh
npm ci
npm run check   # typecheck, unit tests, and an end-to-end test against a real marimo server
```
