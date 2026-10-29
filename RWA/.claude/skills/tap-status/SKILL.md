---
name: tap-status
description: "One-screen TAP26 dashboard for the Real World App: environment and app health (doctor --quick), memory digest highlights, active work, recent app changes from the change ledger, uncommitted git changes, open questions and the last Playwright test results, with a suggested next action. Read-only. Use when the student asks 'status', 'where are we', 'what's going on', 'is everything running', or at the start/end of a session."
argument-hint: "[full]   (default: compact)"
---

# /tap-status — dashboard

## Goal
Give the student a compact, accurate picture of the environment, the work in progress and the memory
in one screen, and suggest the single most useful next action. Changes nothing.

## Inputs
- `$ARGUMENTS` — empty = compact (≤ 35 lines); `full` = include full sections (digest, ledger, questions).
- Snapshot captured at invocation (all read-only):

### Health (doctor --quick)
!`node tap26/scripts/doctor.mjs --quick 2>&1 || true`

### Memory digest
!`node tap26/scripts/memory.mjs show 2>&1 || true`

### Recent app changes (ledger tail)
!`tail -n 10 tap26/memory/changes.md 2>/dev/null || true`

### Git working tree
!`git status --short --branch 2>/dev/null | head -30 || true`

### Open questions
!`node tap26/scripts/memory.mjs show open-questions.md 2>&1 | grep -F -- "- [ ]" | tail -5 || true`

### Last Playwright run
!`cat playwright/test-results/.last-run.json 2>/dev/null || true`

### Skill / agent usage (counters from the journal hook)
!`cat tap26/memory/.state/usage.json 2>/dev/null || true`

### Latest reports
!`ls -t tap26/reports/*/*.md 2>/dev/null | grep -v README | head -5 || true`

## Steps
1. **Read the snapshot above.** Empty sections mean "nothing recorded" (e.g. no `.last-run.json` → no
   Playwright run yet; no ledger → no app changes recorded). Do not re-run the commands unless a section
   shows an error that needs confirming.
2. **Interpret health.** From the doctor output take PASS/WARN/FAIL counts and every FAIL row. If the
   doctor script is missing or errors, say so and fall back to: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/checkAuth`
   (401 = API up, not logged in) and the same for http://localhost:3000.
3. **Interpret the last run.** `.last-run.json` has `status` (`passed`/`failed`) and `failedTests` ids;
   if failed, list the count and suggest `/tap-run-tests` or `/tap-debug`. Mention the HTML report:
   `npm --prefix playwright run report`.
4. **Usage.** If the usage snapshot is non-empty, show the top 5 skills and top 5 agents by count
   (`skills` / `agents` objects); otherwise omit the line.
5. **Cross-check work in progress.** Compare git changes with the ledger: app files changed
   (`backend/`, `src/`, `data/`) but no test changes under `playwright/` → flag "tests may be out of
   sync — `/tap-sync-tests`". `data/database.json` modified is normal (app writes to it).
6. **Pick ONE next action** by priority: FAIL in doctor → `/tap-doctor` or `/tap-run`; failed last run →
   `/tap-debug`; app changed without tests → `/tap-sync-tests`; uncommitted work → `/tap-review`;
   open questions → `/tap-ask <role>`; otherwise → continue active work or `/tap-lab`.
7. Optional: if the student asks for detail on a FAIL row, delegate to `env-ops` with the row text.
   Mention the VS Code equivalents where useful: Terminal → Run Task → "TAP: Doctor" / "TAP: Start app".

## Quality gates
- Read-only: no files written, no servers started, no database reseeded.
- Every status claim comes from the snapshot or a command run now — never from assumptions.
- Compact mode fits in ~35 lines; secrets or full cookies never shown.

## Output
A dashboard in this order:
```
TAP26 status — <date time>
Health      PASS n · WARN n · FAIL n   (FAIL rows with one-line fix)
App         UI :3000 <up/down> · API :3001 <up/down>
Active work <from digest>
Changes     <n> ledger entries (last: <file>) · git: <n> modified, <n> untracked
Tests       last run <passed/failed (n)> · report: npm --prefix playwright run report
Questions   <n> open (top: Q-### …)
Usage       top skills: <name n, …> · top agents: <name n, …>   (if recorded)
Reports     <latest 3>
Next        <one command + why>
```
In `full` mode append the digest's Recent learnings and Recent decisions sections and the full ledger tail.

## Memory
- Read-only by default. If the student confirms that a section is stale (e.g. active work finished),
  offer: `node tap26/scripts/memory.mjs set-active "<new focus>"` then `node tap26/scripts/memory.mjs digest`.

## Learn more
- `tap26/docs/05-memory-and-self-learning.md`, `tap26/docs/13-troubleshooting.md`
- Lab: `tap26/labs/lab-02-*` (run the app and read its health)
