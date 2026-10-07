// opencode-marimo (server): before every model request, append the current
// state of the marimo notebook open under the project directory as the last
// message. The message exists only in that request, never in the session, so
// the model sees the latest copy and old copies never pile up. opencode marks
// the last two messages as Anthropic cache breakpoints, so the conversation
// before the state block stays cached.
//
// The port of pi-marimo; src/core is shared with it unchanged.

import type { Hooks, Plugin } from "@opencode-ai/plugin";
import { snapshot, STATE_TAG } from "./core/render.js";
import { nodeIo } from "./core/node-io.js";
import { MarimoWatcher } from "./core/watcher.js";
import { modeFromEnv } from "./mode.js";

type Message = { info: Record<string, any>; parts: Array<Record<string, any>> };

/** Append the state block as a synthetic user message, modelled on the latest user message. */
export function appendState(messages: Message[], text: string): void {
  const last = [...messages].reverse().find((m) => m.info.role === "user");
  if (!last) return;
  const id = `${last.info.id}-marimo-state`;
  messages.push({
    info: { ...last.info, id, time: { created: Date.now() } },
    parts: [{ id: `${id}-text`, sessionID: last.info.sessionID, messageID: id, type: "text", text, synthetic: true }],
  });
}

export const MarimoPlugin: Plugin = async ({ directory }) => {
  const watcher = new MarimoWatcher({ io: nodeIo(), cwd: directory, token: process.env.MARIMO_TOKEN, onChange: () => {} });
  watcher.mode = modeFromEnv();
  watcher.start();
  let seenSeq = 0;

  const hooks: Hooks = {
    dispose: async () => {
      await watcher.stop();
    },
    event: async ({ event }) => {
      // Browser edits made after the agent finished are flagged as new next time.
      if (event.type === "session.idle") seenSeq = watcher.notebook.seq;
    },
    "chat.message": async () => {
      watcher.refresh();
      await watcher.settle(2000);
    },
    "experimental.chat.messages.transform": async (_input, output) => {
      if (!watcher.attachment || watcher.connection !== "connected" || !watcher.notebook.ready) return;
      const messages = output.messages as unknown as Message[];
      if (messages.some((m) => m.parts.some((p) => typeof p.text === "string" && p.text.startsWith(`<${STATE_TAG}`)))) return;
      appendState(messages, snapshot(watcher.notebook, watcher.attachment, { seenSeq, others: watcher.others() }));
    },
  };
  return hooks;
};

export default { id: "opencode-marimo", server: MarimoPlugin };
