#!/usr/bin/env node
/**
 * PreToolUse(Bash) guardrail — blocks destructive commands and asks before risky ones.
 * Each rule explains *why*, so the guardrail doubles as a teaching moment.
 *
 * Prefix-based permission rules are not a security boundary (a command can be wrapped in
 * `sh -c`), so this hook inspects the whole command string. It is a safety net for students,
 * not a sandbox.
 */
import { journal, readInput, respond, safely } from "./lib.mjs";

/** [pattern, decision, reason] — first match wins. */
const RULES = [
  [/\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b[^|;&]*\s(\/|~|\$HOME|\.\.?)(\s|$|\/\*?)/i, "deny",
    "Recursive force-delete of a root, home or project-level path. Delete specific files instead."],
  [/\b(sudo|doas)\b/, "deny", "No elevated privileges in TAP26 — everything here runs as your user."],
  [/\bgit\s+push\b.*\s(--force\b|-f\b|--force-with-lease\b)/, "deny",
    "Force-pushing rewrites shared history. Push normally or open a PR."],
  [/\b(curl|wget)\b[^|]*\|\s*(sh|bash|zsh|node)\b/, "deny", "Piping a download straight into a shell runs unreviewed code."],
  [/\bchmod\s+-R\s+0?777\b/, "deny", "World-writable permissions are never needed here."],
  [/(>|\btee\b)\s*\.?\/?\.env(\.|\s|$)/, "deny", "Do not overwrite .env files from the shell — edit them deliberately."],
  [/(>|\btee\b)\s*\.?\/?data\/database-seed\.json/, "deny",
    "data/database-seed.json is the shared seed every test relies on. Change it only via `yarn db:seed` with approval."],
  [/\bnpm\s+publish\b|\byarn\s+publish\b/, "deny", "Publishing packages is out of scope for TAP26."],
  [/\bgit\s+reset\s+--hard\b/, "ask", "`git reset --hard` discards uncommitted work. Confirm nothing valuable is lost."],
  [/\bgit\s+clean\s+-[a-z]*f/, "ask", "`git clean -f` permanently deletes untracked files (including new tests/docs)."],
  [/\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$)/, "ask", "This discards all unstaged changes in the working tree."],
  [/\bgit\s+push\b/, "ask", "Pushing shares your work with others — make sure the change was reviewed."],
  [/\bgit\s+branch\b.*\s(-D\b|--delete\s+--force\b|-d\s+-f\b)/, "ask", "Force-deleting a branch loses any commits that were not merged."],
  [/\bgit\s+stash\s+(drop|clear)\b/, "ask", "Dropping or clearing stashes permanently loses the stashed work."],
  [/\bgit\s+(switch|checkout)\b.*(--discard-changes|--force\b|\s-f\b)/, "ask", "This switches branches by discarding your local changes."],
  [/\byarn\s+db:seed(\s|$)/, "ask",
    "`yarn db:seed` REGENERATES the seed with new random data; ids and many test expectations will change. Use `POST /testData/seed` or `yarn db:seed:dev` to reset instead."],
  [/\b(rm|del|rmdir)\b.*\b(playwright\/tests|cypress\/tests|tap26\/memory)\b/, "ask",
    "Deleting tests or shared memory — make sure this is intended."],
];

/** Agents that must stay read-only (enforced here, not just by their instructions). */
const READ_ONLY_AGENTS = new Set(["tutor", "code-reviewer"]);
const WRITE_COMMANDS =
  /\bgit\s+(add|commit|stash|switch|checkout|branch|merge|rebase|reset|restore|clean|push|tag|cherry-pick|revert|apply|am)\b|\bplaywright\s+test\b|\b(npm|yarn|npx|pnpm)\s+(install|add|remove|ci|run\s+test|test|db:seed)|\b(rm|mv|cp|mkdir|touch|tee|sed\s+-i|truncate)\b|(^|[^<>&|2])>{1,2}\s*[^&\s]|curl\b[^|]*-X\s*(POST|PUT|PATCH|DELETE)|tap26\/scripts\/\S+\.mjs\b.*\s--write\b|memory\.mjs\s+(add-|answer|log-change|journal|set-active|digest)|scan-app\.mjs/;

await safely(async () => {
  const input = await readInput();
  const command = String(input?.tool_input?.command ?? "");
  if (READ_ONLY_AGENTS.has(input.agent_type) && WRITE_COMMANDS.test(command)) {
    journal(`[guard] deny (${input.agent_type} is read-only) bash: ${command.slice(0, 120)}`);
    respond({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `TAP26 guardrail: the ${input.agent_type} agent is read-only — it may inspect (git status/diff/log, cat, grep, doctor, typecheck) but not change files, git state or test data.`,
      },
    });
  }
  const hit = RULES.find(([pattern]) => pattern.test(command));
  if (!hit) return;
  const [, decision, reason] = hit;
  journal(`[guard] ${decision} bash: ${command.slice(0, 120)}`);
  respond({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: decision,
      permissionDecisionReason: `TAP26 guardrail: ${reason}`,
    },
  });
});
