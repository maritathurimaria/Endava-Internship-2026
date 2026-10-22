#!/usr/bin/env node
/**
 * PostToolUse(Edit|Write|MultiEdit) hook — the change ledger.
 * Records every edit to application code in tap26/memory/changes.md (consumed by the
 * test-impact-analyst and /tap-sync-tests) and reminds Claude, once per file per session,
 * which follow-ups the change implies (OpenAPI, tests, docs).
 */
import { join } from "node:path";
import { MEMORY_DIR, STATE_DIR, appendLine, readInput, readJson, repoPath, respond, safely, stamp, writeJson } from "./lib.mjs";

const AREAS = [
  [/^backend\/.*routes\.ts$|^backend\/(app|auth)\.ts$/, "api-route",
    "API route changed → update tap26/openapi/openapi.yaml (+ regenerate openapi.json), run `node tap26/scripts/spec-drift.mjs`, then /tap-sync-tests."],
  [/^backend\/(validators|helpers)\.ts$/, "api-validation",
    "Validation/auth changed → check status codes in OpenAPI and negative API tests (422/401)."],
  [/^backend\/database\.ts$/, "api-data", "Data layer changed → run API tests; check side effects (balances, notifications)."],
  [/^backend\/graphql\//, "graphql", "GraphQL changed → update the GraphQL section of OpenAPI and bank-account tests."],
  [/^backend\//, "backend", "Backend changed → run API tests (`npx playwright test --project=api` in playwright/)."],
  [/^src\/machines\//, "state-machine", "State machine changed → UI tests using window services may be affected; run /tap-sync-tests."],
  [/^src\/models\//, "model", "Model changed → sync playwright/src/types/models.ts and OpenAPI schemas."],
  [/^src\//, "frontend", "UI changed → if data-test attributes changed, run /tap-sync-tests; run UI tests."],
  [/^data\/.*seed.*\.json$|^scripts\/.*[sS]eed/, "seed", "Seed changed → many test expectations depend on seed counts; run the full suite."],
  [/^tap26\/openapi\/openapi\.yaml$/, "openapi",
    "OpenAPI changed → regenerate openapi.json (`npx --yes js-yaml tap26/openapi/openapi.yaml > tap26/openapi/openapi.json`), lint, run contract tests."],
  [/^playwright\/(tests|src)\//, "tests", "Tests changed → `npm --prefix playwright run typecheck` and run the affected spec twice."],
];

await safely(async () => {
  const input = await readInput();
  const target = input?.tool_input?.file_path;
  if (!target) return;
  const path = repoPath(target);
  const area = AREAS.find(([pattern]) => pattern.test(path));
  if (!area) return;
  const [, kind, reminder] = area;
  const who = input.agent_type || "main";

  if (kind !== "tests" && kind !== "openapi") {
    appendLine(join(MEMORY_DIR, "changes.md"), `- ${stamp()} | ${path} | ${input.tool_name ?? "edit"} (${kind}) | ${who}`);
  }

  const stateFile = join(STATE_DIR, `reminders-${input.session_id ?? "unknown"}.json`);
  const seen = readJson(stateFile, []);
  if (seen.includes(path)) return;
  writeJson(stateFile, [...seen, path]);

  respond({
    hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `TAP26 change ledger: ${path} (${kind}). ${reminder}` },
  });
});
