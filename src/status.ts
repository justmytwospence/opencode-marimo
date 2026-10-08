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

/** A run of text in the status line; `color` names a theme color, or the line's own when absent. */
export interface Segment {
  text: string;
  color?: "warning" | "accent" | "error";
}

/**
 * The line beside the prompt, short because the agent and model labels share it:
 * `marimo fit.py · 1 error`, or while a cell runs `marimo ▸ Model fit 12s · 1 error`.
 * Undefined shows nothing.
 */
export function segments(v: View): Segment[] | undefined {
  const p = v.parts;
  if (!p) return v.note ? [{ text: "marimo " }, { text: v.note, color: "warning" }] : undefined;
  const out: Segment[] = [{ text: "marimo " }];
  if (p.running) {
    out.push({ text: "▸ ", color: "warning" });
    const section = shortSection(p.running.section) || `cell ${p.running.cell}`;
    out.push({ text: `${section}${p.running.elapsed ? ` ${p.running.elapsed}` : ""}` });
  } else {
    out.push({ text: p.notebook, color: "accent" });
  }
  if (p.connection !== "connected") out.push({ text: " · " }, { text: p.connection, color: "warning" });
  if (p.errors) out.push({ text: " · " }, { text: `${p.errors} error${p.errors === 1 ? "" : "s"}`, color: "error" });
  if (p.others) out.push({ text: ` · +${p.others}` });
  return out;
}
