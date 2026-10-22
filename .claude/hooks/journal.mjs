#!/usr/bin/env node
/**
 * Journal + usage metrics hook (UserPromptSubmit, SubagentStop).
 * Writes a one-line, human-readable trail to tap26/memory/journal/<date>.md and counts which
 * skills/agents are used (tap26/memory/.state/usage.json). The knowledge-curator turns this into
 * retros, learnings and evolution proposals. Disable with env TAP26_JOURNAL=0.
 */
import { countUsage, journal, readInput, safely } from "./lib.mjs";

const oneLine = (text, max = 160) => {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
};

await safely(async () => {
  const input = await readInput();
  switch (input.hook_event_name) {
    case "UserPromptSubmit": {
      const prompt = String(input.prompt ?? "");
      // Internal notifications (background agents finishing, system reminders) are not student prompts.
      if (/^\s*<(task-notification|system-reminder)/.test(prompt)) break;
      const skill = prompt.match(/^\/([\w-]+)/)?.[1];
      if (skill) countUsage("skills", skill);
      journal(`[prompt] ${oneLine(prompt)}`);
      break;
    }
    case "SubagentStop": {
      const agent = input.agent_type || "subagent";
      countUsage("agents", agent);
      journal(`[agent] ${agent} finished`);
      break;
    }
    default:
      break;
  }
});
