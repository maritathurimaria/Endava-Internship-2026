---
name: tap-scan
description: "Refresh TAP26's generated knowledge about the Real World App by running scan-app.mjs (API routes, UI routes, data-test selectors, tests inventory, coverage matrix into tap26/knowledge/generated/), then have the knowledge-curator summarise what changed since the last scan — new or removed routes and selectors, tests that reference removed selectors, coverage gaps — and update memory. Use when the student asks 'rescan the app', 'refresh the knowledge base', after pulling or making app changes, or before /tap-test-plan or /tap-sync-tests."
argument-hint: "[no args]"
---

# /tap-scan — refresh generated knowledge

## Goal
Keep the agents' picture of the app accurate: regenerate the inventories from the real code and
explain, in a few lines, what changed and what that means for the tests.

## Inputs
- `$ARGUMENTS` — none needed (anything given is treated as a focus hint for the summary, e.g. `selectors`).
- Script: `node tap26/scripts/scan-app.mjs` → writes `tap26/knowledge/generated/`:
  `api-routes.md`, `ui-routes.md`, `ui-selectors.md`, `tests-inventory.md`, `coverage-matrix.md`.
  These files are generated — never hand-edit them.
- Current generated files: !`ls -l tap26/knowledge/generated 2>/dev/null || true`
- Uncommitted app changes: !`git status --short backend src data 2>/dev/null | head -15 || true`

## Steps
1. **Snapshot the previous scan** (main thread or `env-ops`), cross-platform:
   `node -e "const fs=require('fs'),os=require('os'),p=require('path');const d=p.join(os.tmpdir(),'tap26-scan-prev');fs.rmSync(d,{recursive:true,force:true});if(fs.existsSync('tap26/knowledge/generated'))fs.cpSync('tap26/knowledge/generated',d,{recursive:true});console.log(d)"`
   (prints the snapshot folder; it is empty on the first scan).
2. **Run the scan**: `node tap26/scripts/scan-app.mjs`. If it fails, delegate to `env-ops` with the
   error output (missing script → tell the student the framework install is incomplete and STOP).
3. **Diff**: `git diff --no-index --stat <snapshot> tap26/knowledge/generated` and
   `git diff --no-index <snapshot> tap26/knowledge/generated` (exit code 1 just means "differences found").
   On the first scan, there is no diff — summarise the totals instead.
4. **Delegate to `knowledge-curator`** (Agent tool) with the diff and the new files:
   > Summarise what changed in the generated knowledge since the last scan, for a junior tester.
   > Report: totals before → after (routes, screens, data-test selectors, spec files/tests, covered vs
   > uncovered routes); added and removed API routes; added/removed/renamed `data-test` selectors and,
   > for each removed selector, the tests still referencing it (Grep `playwright/tests` and
   > `playwright/src/ui` for the id); newly uncovered routes in `coverage-matrix.md`; anything surprising.
   > Compare API routes with `tap26/openapi/openapi.yaml` and suggest `node tap26/scripts/spec-drift.mjs`
   > if they diverge. Update memory: `add-fact` for changed totals (replace the meaning, not the history),
   > a journal line, and `digest`. Do not edit generated files, app code or tests. End with the hand-off report.
5. **Recommend** the next step from the findings: removed selectors referenced by tests →
   `/tap-sync-tests`; new routes without tests → `/tap-new-test api …` or `/tap-test-plan`; drift →
   `/tap-swagger`; nothing changed → "knowledge is current".

## Quality gates
- Scan exit code 0 and all five generated files present and non-empty.
- Every "removed selector still referenced" claim lists the referencing file(s).
- Summary distinguishes real app changes from scanner noise (ordering/whitespace-only diffs).
- No hand edits in `tap26/knowledge/generated/`; no app or test files changed.

## Output
- Updated `tap26/knowledge/generated/*.md`.
- Chat (≤ 15 lines):
  ```
  Scan <date>: routes A→B · screens C→D · selectors E→F · tests G→H · uncovered routes I→J
  Added: …   Removed: …   At-risk tests: …   Drift: yes/no
  Next: <one command>
  ```

## Memory
- `node tap26/scripts/memory.mjs add-fact knowledge "scan <date>: <n> API routes, <n> data-test selectors, <n> tests, <n> uncovered routes" --by knowledge-curator`
- `node tap26/scripts/memory.mjs journal "tap-scan: <one-line summary>" --by knowledge-curator`
- Removed selectors still used by tests: `node tap26/scripts/memory.mjs add-question "Sync tests for removed selectors <ids>?" --by knowledge-curator`
- `node tap26/scripts/memory.mjs digest`

## Learn more
- `tap26/docs/05-memory-and-self-learning.md`, `tap26/docs/07-testing-framework.md`
- Labs: `tap26/labs/lab-09-*` (sync tests after changes), `tap26/labs/lab-10-*` (swagger & drift)
