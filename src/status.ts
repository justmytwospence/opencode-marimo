// What the TUI shows, apart from the JSX so it can be tested as plain TypeScript.

import { type StatusParts, statusParts } from "./core/render.js";
import type { MarimoWatcher } from "./core/watcher.js";

export interface View {
  parts?: StatusParts;
  /** Shown instead of parts (several notebooks, or a pinned one not open). */
  note?: string;
}

export function view(watcher: MarimoWatcher, now = Date.now()): View {
  const { connection, attachment, mode } = watcher;
  if (!attachment) return {};
  if (connection === "searching") return mode.kind === "pinned" ? { note: `${attachment.path.split("/").pop()} not open` } : {};
  return { parts: statusParts(watcher.notebook, attachment, connection, now, watcher.others().length) };
}

/** The prompt line is narrow: keep the whole heading path only when short, else the deepest heading. */
export function shortSection(section: string, max = 22): string {
  if (section.length <= max) return section;
  const deepest = section.split(" › ").pop() ?? section;
  return deepest.length <= max ? deepest : `${deepest.slice(0, max - 1)}…`;
}
