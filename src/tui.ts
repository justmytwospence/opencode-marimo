// opencode-marimo (TUI): the current notebook and what its kernel is running, to
// the right of the prompt; every followed notebook in the session sidebar.
//
// Plain TypeScript rather than JSX, with Solid taken from opencode: see host.ts.

import type { TuiPlugin } from "@opencode-ai/plugin/tui";
import { nodeIo } from "./core/node-io.js";
import { pairTargets } from "./core/touch.js";
import { MarimoWatcher } from "./core/watcher.js";
import { block, line, loadHost } from "./host.js";
import { modeFromEnv } from "./mode.js";
import { type Segment, segments, sidebarLines, type View, view } from "./status.js";

const tui: TuiPlugin = async (api) => {
  const host = await loadHost();
  const [current, setCurrent] = host.solid.createSignal<View>({});
  const [list, setList] = host.solid.createSignal<Segment[][] | undefined>(undefined);
  let ticker: ReturnType<typeof setInterval> | undefined;
  const watcher: MarimoWatcher = new MarimoWatcher({
    io: nodeIo(),
    cwd: api.state.path.directory || process.cwd(),
    token: process.env.MARIMO_TOKEN,
    onChange: () => update(),
  });
  const update = (): void => {
    setCurrent(view(watcher));
    setList(sidebarLines(watcher));
    const running = watcher.connection === "connected" && watcher.notebook.running();
    if (running && !ticker) ticker = setInterval(update, 1000);
    if (!running && ticker) { clearInterval(ticker); ticker = undefined; }
  };
  watcher.mode = modeFromEnv();
  watcher.start();
  // The TUI runs apart from the server half, so it reads the agent's marimo-pair calls from the
  // session's tool parts to keep the same notebook current.
  const unsubscribe = api.event.on("message.part.updated", (event) => {
    const part = event.properties.part as { type?: string; state?: { status?: string; input?: unknown } };
    if (part.type !== "tool" || part.state?.status !== "running") return;
    const targets = pairTargets(JSON.stringify(part.state.input ?? {}));
    if (targets.length) watcher.touch(targets);
  });
  api.lifecycle.onDispose(async () => {
    unsubscribe();
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
  // The sidebar names every followed notebook; the prompt line has room only for the current one.
  const sidebar = () =>
    block(
      host,
      () => theme().textMuted,
      () => list()?.map((l) => l.map((s) => (s.color ? { text: s.text, color: theme()[s.color] } : { text: s.text }))),
    );
  api.slots.register({
    order: 300,
    slots: {
      home_prompt_right: status,
      session_prompt_right: status,
      sidebar_content: sidebar,
    },
  });
};

export default { id: "opencode-marimo-tui", tui };
