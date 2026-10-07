/** @jsxImportSource @opentui/solid */
// opencode-marimo (TUI): the notebook and what its kernel is running, to the
// right of the prompt.

import type { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui";
import { createSignal, Show } from "solid-js";
import { nodeIo } from "./core/node-io.js";
import { MarimoWatcher } from "./core/watcher.js";
import { modeFromEnv } from "./mode.js";
import { shortSection, type View, view } from "./status.js";

// The prompt line is shared with the agent and model labels, so this stays short:
// `marimo fit.py · 1 error`, or while a cell runs `marimo ▸ Model fit 12s · 1 error`.
function Status(props: { api: TuiPluginApi; view: View }) {
  const theme = () => props.api.theme.current;
  const p = () => props.view.parts;
  return (
    <Show when={p() || props.view.note}>
      <text fg={theme().textMuted} wrapMode="none">
        {"marimo "}
        <Show when={p()} fallback={<span style={{ fg: theme().warning }}>{props.view.note}</span>}>
          <Show
            when={p()!.running}
            fallback={<span style={{ fg: theme().accent }}>{p()!.notebook}</span>}
          >
            <span style={{ fg: theme().warning }}>{"▸ "}</span>
            {`${shortSection(p()!.running!.section) || `cell ${p()!.running!.cell}`}${p()!.running!.elapsed ? ` ${p()!.running!.elapsed}` : ""}`}
          </Show>
          <Show when={p()!.connection !== "connected"}>
            {" · "}
            <span style={{ fg: theme().warning }}>{p()!.connection}</span>
          </Show>
          <Show when={p()!.errors}>
            {" · "}
            <span style={{ fg: theme().error }}>{`${p()!.errors} error${p()!.errors === 1 ? "" : "s"}`}</span>
          </Show>
          <Show when={p()!.others}>{` · +${p()!.others}`}</Show>
        </Show>
      </text>
    </Show>
  );
}

const tui: TuiPlugin = async (api) => {
  const [current, setCurrent] = createSignal<View>({});
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
  api.slots.register({
    order: 300,
    slots: {
      home_prompt_right: () => <Status api={api} view={current()} />,
      session_prompt_right: () => <Status api={api} view={current()} />,
    },
  });
};

export default { id: "opencode-marimo-tui", tui };
