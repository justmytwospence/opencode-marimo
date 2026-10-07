import type { Mode } from "./core/watcher.js";

/** MARIMO_NOTEBOOK=<path> follows that notebook, =off turns the plugin off; unset follows the one open under the project. */
export function modeFromEnv(env: NodeJS.ProcessEnv = process.env): Mode {
  const pinned = env.MARIMO_NOTEBOOK?.trim();
  if (pinned === "off") return { kind: "off" };
  return pinned ? { kind: "pinned", path: pinned } : { kind: "auto" };
}
