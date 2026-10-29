# EP-001 — Make Playwright test tasks PowerShell-safe

| Field | Value |
|---|---|
| Status | proposed |
| Author / date | GitHub Copilot / 2026-10-20 (evidence updated 2026-10-22) |
| Semver impact | minor (changes the execution behavior of existing test tasks) |
| Guardrail impact | none |
| Evidence | `tap26/reports/retros/retro-20261020-1613-weekly.md`; `tap26/reports/retros/retro-20261022-2310-weekly-followup.md`; L-008; TAP: Test e2e exited before Playwright with PowerShell `PSSecurityException` on `npx.ps1`; debugger suggested `npm.cmd --prefix playwright run test:e2e` but that workaround remains unverified |

## Problem
The existing VS Code Playwright tasks use bare `npx playwright test`. In this Windows PowerShell setup, command resolution selected `npx.ps1`, and the active script-execution policy blocked it before Playwright started. The Bob/Alice E2E result therefore remains unknown. The debugger recommended `npm.cmd --prefix playwright run test:e2e`, which should avoid the PowerShell shim, but it has not yet produced a trustworthy reporter result.

## Proposed change
| File | Action | Summary |
|---|---|---|
| `.vscode/tasks.json` | edit | Convert Playwright tasks to `type: "process"`, command `node`, and args beginning with `node_modules/playwright/cli.js`; preserve each project's args, working directory, labels, and output visibility. |
| `tap26/docs/13-troubleshooting.md` | edit | Document the exact `npx.ps1` execution-policy error, the `npm.cmd` workaround, and the process-task fallback; do not advise relaxing the user's execution policy. |

Out of bounds for evolution: `backend/`, `src/`, `data/`, `cypress/`.

## Alternatives considered
- Use `npm.cmd --prefix playwright run test:e2e` (or the project's equivalent npm script) — minimal immediate workaround; first verify it displays a reporter result and exit code, then decide whether task rewiring is still needed.
- Change PowerShell's execution policy — rejected because it changes machine security settings and is unnecessary.
- Require Git Bash — rejected because it adds setup requirements and the installed Node CLI can be invoked directly.

## Risks
- The package-local CLI path may change if Playwright packaging changes — verify it exists after `npm ci` and execute from the Playwright working directory.
- Changing task type can affect presentation or exit-code handling — retain visible output and verify both a passing test and a deliberate failure propagate the correct exit codes.

## How we will test the change
- Under the current PowerShell policy, run the Bob/Alice focused E2E test through `npm.cmd` and capture test title, result, and exit code.
- Run the E2E, desktop, mobile, tablet, and API VS Code tasks and confirm each reaches Playwright without `PSSecurityException`.
- Confirm a deliberate failure produces nonzero exit and a passing focused test produces zero exit with reporter counts; run Playwright typecheck.

## Success metric
- All Playwright VS Code tasks run on the Windows setup without PowerShell shim errors and show attributable reporter counts plus an accurate process exit code.

## Review
- Recommendation: pending review.
- Overlaps: L-008 (process-based VS Code tasks); weekly retrospectives dated 2026-10-20 and 2026-10-22.

## Approval & application log
- Student approval: pending.
- Guardrail approval: n/a.
- Applied: not applied.
- Deviations from plan: n/a.
