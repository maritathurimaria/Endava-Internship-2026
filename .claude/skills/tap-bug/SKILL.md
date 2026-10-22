---
name: tap-bug
description: "Write a reproducible bug report for the Real World App (BUG-###) from a symptom: reproduce on a clean seed, capture expected vs actual, evidence and severity/priority; optionally have the debugger confirm the root cause (file:line) and add a regression test that is marked as expected-to-fail until fixed. Use when the student found something wrong, e.g. 'the balance doesn't update after a payment', 'file a bug: bank account accepts an 8-digit routing number via the API'."
argument-hint: "<symptom> [verify] [regression api|ui]"
---

# /tap-bug — reproducible bug report

## Goal
Turn "something looks wrong" into a bug report a developer can reproduce in two minutes, with a
justified severity, evidence, and (optionally) a confirmed root cause and a regression test.

## Inputs
- `$ARGUMENTS` — the symptom in the student's words, plus optional flags anywhere in the text:
  - `verify` — ask `debugger` to confirm the root cause (always done for severity critical/major);
  - `regression api` / `regression ui` — add a regression test via `api-automation` / `ui-automation`.
- Empty → ask for: what you did, what you expected, what happened. Then STOP.
- Template: `tap26/templates/bug-report.md`. Output: `tap26/reports/bugs/BUG-###-<slug>.md`.

## Steps
1. **Next id.** Glob `tap26/reports/bugs/BUG-*.md`; next id = highest number + 1, zero-padded to 3
   (first bug = `BUG-001`). Slug = 3–6 kebab-case words from the symptom.
2. **Check for duplicates.** Grep `tap26/reports/bugs/`, the catalogue `tap26/knowledge/known-issues.md`
   (KI-## ids) and `node tap26/scripts/memory.mjs search "<keyword>"`. If it matches a known issue,
   say so, link the KI id in the report's "Related" field, and ask whether to continue.
3. **Reproduce — delegate to `manual-tester`** (Agent tool):
   > Reproduce: "<symptom>". Warn first that reseeding wipes manual data, then reset with
   > `POST http://localhost:3001/testData/seed` and reproduce from a clean state as a seeded user
   > (password `s3cret`). Prefer the shortest path: API (`POST /login` then the call) if the bug is in the
   > API, the UI (http://localhost:3000) otherwise; a throwaway Playwright script is fine. Capture:
   > exact steps, request/response (method, path, status, trimmed body), `data-test` ids involved,
   > screenshots under `tap26/reports/bugs/evidence/BUG-###/`, environment (commit `git rev-parse --short HEAD`,
   > browser, viewport). Reproduce at least twice; note the rate (e.g. 3/3). Fill `tap26/templates/bug-report.md`
   > and save as `tap26/reports/bugs/BUG-###-<slug>.md`. Severity: critical (money/data loss, security,
   > no workaround), major (feature broken, workaround exists), minor (cosmetic/validation message),
   > trivial. Priority P1–P3 with one-line justification. Do not fix anything. End with the hand-off report.
   If it does NOT reproduce, the report is saved with status `cannot-reproduce` and what was tried.
4. **Root cause (optional) — delegate to `debugger`** when `verify` was given or severity is critical/major:
   > Read `tap26/reports/bugs/BUG-###-<slug>.md`. Confirm or refute the root cause by reading code and
   > reproducing; cite `file:line` (e.g. `backend/validators.ts`, `backend/database.ts`, a component or
   > machine). Propose a fix in prose/diff in your hand-off but DO NOT apply it. Append a
   > "Root cause (confirmed by debugger)" section to the bug file.
5. **Regression test (optional)** when `regression api|ui` was given — delegate to `api-automation` or
   `ui-automation`:
   > Add a test reproducing BUG-### in `playwright/tests/api/` or `playwright/tests/ui/` (functional style,
   > `@fixtures/*` + `@api`/`@ui` helpers, `bySel` selectors). Per D-005 the test asserts the CORRECT
   > (expected) behaviour and is marked `test.fail(true, 'BUG-###: <summary>')` (use the `KI-xx` id instead
   > if the bug is a known issue), so the suite stays green and the test flips to an unexpected pass once
   > the defect is fixed (then remove `test.fail` and close the bug). Run it twice; run
   > `npm --prefix playwright run typecheck`.
6. **Link everything**: add the test path to the bug file's "Regression test" field.

## Quality gates
- Steps start from a clean seed and a named user; a stranger can follow them verbatim.
- Expected vs actual are both stated; expected cites a source (UI copy, OpenAPI, story, common sense flagged as such).
- Evidence exists on disk or inline (request/response, screenshot path).
- Severity and priority are justified separately.
- No application code was changed by this skill. A regression test (if any) asserts correct behaviour, is marked
  `test.fail(true, 'BUG-###: …')` (D-005),
  passed typecheck and behaved the same in 2 runs.

## Output
- `tap26/reports/bugs/BUG-###-<slug>.md` (+ `evidence/BUG-###/`).
- Chat: id, title, severity/priority, reproduction rate, root cause (if verified), regression test path,
  and the suggested next step (`/tap-debug` or `/tap-change-api|ui` to fix).

## Memory
- Root cause pattern worth remembering: `node tap26/scripts/memory.mjs add-learning "<title>" --lesson "<text>" --tags bug,<area> --applies manual-tester,debugger --by debugger`.
- Test added: `node tap26/scripts/memory.mjs log-change <spec path> "regression test for BUG-###" --by <agent>`.
- Unclear intended behaviour: `node tap26/scripts/memory.mjs add-question "<question> (BUG-###)" --by manual-tester`.

## Learn more
- `tap26/docs/06-workflows.md` (debugging workflow), `tap26/docs/13-troubleshooting.md`
- Labs: `tap26/labs/lab-03-*` (explore), `tap26/labs/lab-13-*` (debugging)
