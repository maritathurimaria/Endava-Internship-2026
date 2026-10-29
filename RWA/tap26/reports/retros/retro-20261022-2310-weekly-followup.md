# Retro — Week through 2026-10-22 (2026-10-22)

| Field | Value |
|---|---|
| Scope | Weekly follow-up through 2026-10-22; this report adds the debugger's command workaround to the 2026-10-20 evidence |
| Participants | Student, GitHub Copilot |
| Evidence | `tap26/reports/retros/retro-20261020-1613-weekly.md`; `tap26/evolution/proposals/EP-001-powershell-safe-playwright-tasks.md`; TAP: Test e2e task output; student-provided debugger recommendation |

## Context
The previous weekly retro identified that the Bob/Alice E2E result was unverified because PowerShell blocked the `npx.ps1` shim. On 2026-10-22, the student shared the debugger's suggested workaround: `npm.cmd --prefix playwright run test:e2e`.

## Timeline
| Time | Event | Evidence |
|---|---|---|
| 2026-10-20 | TAP: Test e2e failed before starting Playwright because PowerShell blocked `npx.ps1` | Task output: `PSSecurityException`, “running scripts is disabled on this system,” exit code 1 |
| 2026-10-20 | Local CLI and `npm.cmd` attempts did not return usable reporter output; Bob/Alice result remained unverified | `retro-20261020-1613-weekly.md` |
| 2026-10-22 | Debugger recommended `npm.cmd --prefix playwright run test:e2e` to bypass the PowerShell shim | Student-provided debugger output |
| 2026-10-22 | Existing EP-001 was confirmed as the matching improvement; no duplicate proposal was created | `tap26/evolution/proposals/EP-001-powershell-safe-playwright-tasks.md` |

## Metrics
| Metric | Value |
|---|---|
| Tests added / updated | 0 this follow-up |
| Test runs green / red | No new test run; debugger's command is a recommendation, not a result |
| Quality gates passed / failed (which) | None executed this follow-up; prior E2E task was blocked before test startup |
| Bugs filed | No new bug reports |
| Review verdicts | n/a |

## What went well
- The debugger identified a plausible Windows-specific workaround that avoids changing PowerShell execution policy.
- EP-001 already captures the root improvement, so the follow-up did not create a duplicate proposal.

## What didn't go well
- There is still no reporter output proving the Bob/Alice test started or passed.
- The prior local CLI attempts produced ambiguous output, so `.last-run.json` was not treated as evidence for that specific test.

## Surprises
- The workaround invokes the existing npm script and should route to the locally installed Playwright CLI, avoiding `npx.ps1`; it still needs a verified run with a visible result.

## Root cause of the biggest problem (5 whys)
1. Why is the Bob/Alice test result unknown? No trustworthy focused reporter output was captured.
2. Why did the repository task not start the test? PowerShell blocked the `npx.ps1` shim.
3. Why did the workaround not close the gap yet? The recommended `npm.cmd` command has not been confirmed with visible reporter output.
4. Why is the task itself still fragile? The VS Code task invokes bare `npx` through a shell.
5. Why can we change this? Configure the task to invoke Node/the local Playwright CLI as a process, then verify the reporter and exit code on this Windows setup.

## Learnings distilled to memory (max 3 new)
| Id | Title | Lesson (do X when Y) | Applies to |
|---|---|---|---|
| — | No new learning | Reuse L-008; keep this workaround pending until it produces a verified test result | env-ops, tap-run-tests |

Other memory updates: none; no new decisions or answered questions.

## Actions
| Action | Owner | Due | Done when |
|---|---|---|---|
| Review EP-001; do not apply until explicitly approved | Student | Next session | Student accepts, revises, or rejects the proposed task changes |
| Try the focused Bob/Alice test through `npm.cmd` and retain its reporter output | Student / env-ops | Next test session | Test title, pass/fail status, and process exit code are visible and attributable |
| If the workaround succeeds, update EP-001 validation evidence; otherwise implement its process-task proposal only after approval | env-ops | After run | All supported Windows Playwright tasks start and report a result |

## Evolution ideas
- Existing proposal: make Playwright test tasks PowerShell-policy independent → EP-001; no duplicate proposal created.
