import { describe, expect, test } from "vitest";
import { modeFromEnv } from "../src/mode.js";
import { insertState, turnOf } from "../src/server.js";
import { segments, shortSection } from "../src/status.js";

describe("server", () => {
  test("the state block is a synthetic user message right after the turn's prompt", () => {
    const user = { info: { id: "msg_1", sessionID: "ses_1", role: "user", agent: "build", model: { providerID: "anthropic", modelID: "m" }, time: { created: 1 } }, parts: [{ type: "text", text: "hi" }] };
    const assistant = { info: { id: "msg_2", sessionID: "ses_1", role: "assistant" }, parts: [{ type: "tool", state: { status: "completed" } }] };
    const messages = [user, assistant];
    expect(turnOf(messages)).toBe("msg_1");
    insertState(messages, "<marimo_notebook_state>…</marimo_notebook_state>");
    expect(messages).toHaveLength(3);
    const state = messages[1]!;
    expect(state.info).toMatchObject({ id: "msg_1-marimo-state", role: "user", agent: "build", sessionID: "ses_1" });
    expect(state.parts[0]).toMatchObject({ type: "text", synthetic: true, messageID: "msg_1-marimo-state", text: "<marimo_notebook_state>…</marimo_notebook_state>" });
    expect(messages[2]).toBe(assistant);
  });

  test("MARIMO_NOTEBOOK pins or turns off", () => {
    expect(modeFromEnv({})).toEqual({ kind: "auto" });
    expect(modeFromEnv({ MARIMO_NOTEBOOK: "/a/b.py" })).toEqual({ kind: "pinned", path: "/a/b.py" });
    expect(modeFromEnv({ MARIMO_NOTEBOOK: "off" })).toEqual({ kind: "off" });
  });
});

test("the prompt line keeps the whole heading path only when short", () => {
  expect(shortSection("Data › Fit")).toBe("Data › Fit");
  expect(shortSection("Data loading › Slow model fit")).toBe("Slow model fit");
  expect(shortSection("A › An extremely long heading that goes on")).toBe("An extremely long hea…");
});

test("status line segments", () => {
  const parts = { notebook: "fit.py", connection: "connected", queued: 0, errors: 0 };
  expect(segments({})).toBeUndefined();
  expect(segments({ note: "fit.py not open" })).toEqual([{ text: "marimo " }, { text: "fit.py not open", color: "warning" }]);
  expect(segments({ parts })).toEqual([{ text: "marimo " }, { text: "fit.py", color: "accent" }]);
  expect(
    segments({ parts: { ...parts, connection: "connecting", errors: 2, others: 1, running: { section: "Data › Fit", cell: "c1", elapsed: "12s" } } }),
  ).toEqual([
    { text: "marimo " },
    { text: "▸ ", color: "warning" },
    { text: "Data › Fit 12s" },
    { text: " · " },
    { text: "connecting", color: "warning" },
    { text: " · " },
    { text: "2 errors", color: "error" },
    { text: " · +1" },
  ]);
});
