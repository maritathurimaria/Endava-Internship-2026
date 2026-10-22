#!/usr/bin/env node
/**
 * PreToolUse(Edit|Write|MultiEdit|NotebookEdit) guardrail — asks before editing protected files.
 * Protected: the shared seed, env files, lockfiles and TAP26's own definitions (settings, hooks,
 * agents, skills, rules, CLAUDE.md), so an agent can never silently widen the rules it runs under.
 * Read-only agents (tutor, code-reviewer) are denied any edit outside their private memory.
 */
import { journal, readInput, repoPath, respond, safely } from "./lib.mjs";

const PROTECTED = [
  [/^data\/database-seed\.json$/, "the shared seed data every test depends on"],
  [/^data\/empty-seed\.json$/, "the empty seed used by `yarn start:empty`"],
  [/(^|\/)\.env(\.[\w.-]+)?$/, "environment configuration (may contain credentials)"],
  [/^\.claude\/settings(\.local)?\.json$/, "TAP26 permissions and hook wiring"],
  [/^\.claude\/hooks\//, "TAP26 guardrail hooks"],
  [/^yarn\.lock$|^playwright\/package-lock\.json$/, "a lockfile — change dependencies with yarn/npm instead"],
  [/^\.claude\/(agents|skills|rules|output-styles)\//, "a TAP26 agent/skill/rule definition (changes what agents may do — use /tap-evolve)"],
  [/^CLAUDE\.md$/, "the project instructions every session loads"],
];

/** Agents that must stay read-only; they may only write their own private memory notes. */
const READ_ONLY_AGENTS = new Set(["tutor", "code-reviewer"]);

await safely(async () => {
  const input = await readInput();
  const target = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path;
  if (!target) return;
  const path = repoPath(target);
  if (READ_ONLY_AGENTS.has(input.agent_type) && !path.startsWith(".claude/agent-memory")) {
    journal(`[guard] deny (${input.agent_type} is read-only) edit: ${path}`);
    respond({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `TAP26 guardrail: the ${input.agent_type} agent is read-only. Return the content to the caller, who saves it.`,
      },
    });
  }
  const hit = PROTECTED.find(([pattern]) => pattern.test(path));
  if (!hit) return;
  journal(`[guard] ask edit: ${path}`);
  respond({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: `TAP26 guardrail: ${path} is ${hit[1]}. Approve only if this change is intended.`,
    },
  });
});
