// opencode-marimo (TUI): the notebook and what its kernel is running, to the
// right of the prompt.
//
// Plain TypeScript rather than JSX, with Solid taken from opencode: see host.ts.

import type { TuiPlugin } from "@opencode-ai/plugin/tui";
import { nodeIo } from "./core/node-io.js";
import { MarimoWatcher } from "./core/watcher.js";
import { line, loadHost } from "./host.js";
import { modeFromEnv } from "./mode.js";
import { segments, type View, view } from "./status.js";

const tui: TuiPlugin = async (api) => {
  const host = await loadHost();
  const [current, setCurrent] = host.solid.createSignal<View>({});
  let ticker: ReturnType<typeof setInterval> | undefined;
  const watcher: MarimoWatcher = new MarimoWatcher({
    io: nodeIo(),
    cwd: api.state.path.directory || process.cwd(),
    token: process.env.MARIMO_TOKEN,
    onChange: () => update(),
  });
  const update = (): void => {
    setCurrent(view(watcher));
    const running = watcher.connection === "connected" && watcher.notebook.running();
    if (running && !ticker) ticker = setInterval(update, 1000);
    if (!running && ticker) { clearInterval(ticker); ticker = undefined; }
  };
  watcher.mode = modeFromEnv();
  watcher.start();
  api.lifecycle.onDispose(async () => {
    if (ticker) clearInterval(ticker);
    await watcher.stop();
  });
  const theme = () => api.theme.current;
  const status = () =>
    line(
      host,
      () => theme().textMuted,
      () => segments(current())?.map((s) => (s.color ? { text: s.text, color: theme()[s.color] } : { text: s.text })),
    );
  api.slots.register({
    order: 300,
    slots: {
      home_prompt_right: status,
      session_prompt_right: status,
    },
  });
};

export default { id: "opencode-marimo-tui", tui };
