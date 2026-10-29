---
name: tap-review
description: "Independent, read-only code review of the current Real World App diff (default git diff HEAD plus untracked files) or a given ref range, by the code-reviewer agent against TAP26 standards: backend validators/auth/OpenAPI, frontend data-test contract and XState, functional Playwright style, test quality and security. Returns a verdict (approve / approve-with-comments / request-changes) with severity-ranked findings and saves a review report. Use when the student says 'review my changes', 'review main..my-branch', or before committing or opening a PR."
argument-hint: "[git ref range, e.g. main..HEAD or HEAD~3..HEAD]   (default: uncommitted changes vs HEAD)"
---

# /tap-review — independent code review

## Goal
Give the student the review a senior engineer would give: a clear verdict, findings ranked by
severity with `file:line` and a concrete suggestion, and praise for what is good — without changing a
single file of the code under review.

## Inputs
- `$ARGUMENTS` — optional git ref range (`main..HEAD`, `HEAD~2..HEAD`, a commit sha). Empty → the
  uncommitted working tree: `git diff HEAD` plus untracked files from `git status --short`.
- Checklist: `${CLAUDE_SKILL_DIR}/checklist.md` (read it and pass its path to the reviewer).
- Snapshot at invocation (read-only):
  - Working tree: !`git status --short 2>/dev/null | head -40 || true`
  - Diff size vs HEAD: !`git diff HEAD --stat 2>/dev/null | tail -25 || true`

## Steps
1. **Decide the scope.** Range given → `git diff <range>` and `git log --oneline <range>`.
   Empty → `git diff HEAD` + untracked files (exclude `tap26/reports/**`, `tap26/memory/**`,
   `playwright/test-results/**`, `playwright/playwright-report/**`, `node_modules`).
   If there is nothing to review, say so and STOP. If the diff is > 1 500 changed lines, ask the student
   whether to review everything or a folder (`backend/`, `src/`, `playwright/`, `.claude/`, `tap26/`).
2. **Delegate to `code-reviewer`** (Agent tool) with this brief:
   > Review <scope> (command: `<git diff command>`; untracked files: <list>). Read
   > `.claude/skills/tap-review/checklist.md` and `tap26/memory/MEMORY.md` first, then the relevant
   > `.claude/rules/*.md` for touched paths. Read the full surrounding code of every hunk, not just the hunk.
   > You are READ-ONLY: do not edit files, do not run tests or reseed. For each finding give: severity
   > (blocker / major / minor / nit), `file:line`, what is wrong, why it matters here, a concrete fix
   > (snippet ≤ 10 lines). Also list "What's good" (≥ 2 items) and "Questions for the author".
   > Check the BLUEPRINT §7 gates relevant to the diff (OpenAPI updated for API changes, `data-test`
   > preserved, tests added/updated, docs, change ledger). Verdict rules: any blocker → request-changes;
   > majors only → request-changes unless trivially fixable; else approve / approve-with-comments.
   > Return the review using the structure of `tap26/templates/review-report.md`, then the hand-off report.
3. **Save** the returned review text (main thread — the reviewer is read-only: no Edit/Write, and the
   `guard-edit`/`guard-bash` hooks deny its writes) to
   `tap26/reports/reviews/review-<YYYYMMDD-HHmm>-<scope-slug>.md`.
4. **Optional verification of claims**: if the reviewer says a test or typecheck would fail, offer to run
   `npm --prefix playwright run typecheck` or `yarn types` — do not run test suites that reseed without asking.
5. **Next steps**: for each blocker/major, name the owning agent (`be-dev`, `fe-dev`, `api-automation`,
   `ui-automation`, `contract-guardian`, `doc-writer`) and offer to route the fix through the orchestrator.

## Quality gates
- The review covers every changed file in scope (list files reviewed vs files in diff).
- Every finding has severity, `file:line` that exists, and an actionable suggestion.
- The verdict follows the rules above; no "LGTM" without evidence.
- Nothing under review was modified (`git diff --stat` identical before and after, apart from the report file).

## Output
- `tap26/reports/reviews/review-<YYYYMMDD-HHmm>-<scope-slug>.md`.
- Chat (≤ 20 lines): verdict, counts by severity, top 3 findings with `file:line`, what's good, next step.

## Memory
Run by the main thread (the reviewer only proposes learnings in its hand-off):
- A recurring mistake (seen before in `learnings.md`) → `node tap26/scripts/memory.mjs add-learning "<pattern>" --lesson "<rule>" --tags review --applies <agents> --by code-reviewer`; if it recurs 3+ times suggest `/tap-evolve propose`.
- Journal: `node tap26/scripts/memory.mjs journal "tap-review <scope>: <verdict> (<b>/<M>/<m>)" --by code-reviewer`.

## Learn more
- `tap26/docs/06-workflows.md` (change → tests → docs → review), `tap26/docs/07-testing-framework.md`
- Labs: `tap26/labs/lab-07-*` (API change), `tap26/labs/lab-08-*` (UI change)
