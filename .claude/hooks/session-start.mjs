#!/usr/bin/env node
/**
 * SessionStart hook — orients every new/resumed session.
 * Injects: TAP26 banner, live app health (ports 3000/3001/3100/3101), today's app-change ledger
 * and how to get going. The memory digest itself is imported by CLAUDE.md (@tap26/memory/MEMORY.md),
 * so it is available even when hooks are disabled.
 */
import net from "node:net";
import { join } from "node:path";
import { MEMORY_DIR, journal, readInput, readText, respond, safely, today } from "./lib.mjs";

const probe = (port, host) =>
  new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(400, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });

/** Vite may bind only to ::1 (IPv6) on some machines, so probe both stacks. */
const isListening = async (port) => (await probe(port, "127.0.0.1")) || (await probe(port, "::1"));

await safely(async () => {
  const input = await readInput();
  const ports = { "UI :3000": 3000, "API :3001": 3001, "Swagger :3100": 3100, "Mock :3101": 3101 };
  const health = await Promise.all(
    Object.entries(ports).map(async ([label, port]) => `${label} ${(await isListening(port)) ? "up" : "down"}`),
  );
  const todaysChanges = readText(join(MEMORY_DIR, "changes.md"))
    .split("\n")
    .filter((line) => line.startsWith(`- ${today()}`))
    .slice(-10);

  journal(`[session] ${input.source ?? "start"}${input.agent_type ? ` as ${input.agent_type}` : ""}`);

  const context = [
    "TAP26-Junior is active (see CLAUDE.md → 'TAP26 operating protocol').",
    `App health: ${health.join(" · ")}.`,
    health[0].endsWith("down") || health[1].endsWith("down")
      ? "The app is not fully running — if the task needs it, start it with /tap-run (or VS Code task 'TAP: Start app')."
      : "The app is running.",
    todaysChanges.length
      ? `App files changed today (change ledger):\n${todaysChanges.join("\n")}\nConsider /tap-sync-tests before finishing.`
      : "No app changes recorded today.",
    "Memory: tap26/memory/MEMORY.md (digest, imported in CLAUDE.md). Record new facts/learnings with node tap26/scripts/memory.mjs.",
  ].join("\n");

  respond({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context } });
});
