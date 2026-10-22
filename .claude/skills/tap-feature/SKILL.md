---
name: tap-feature
description: "Build a full feature slice on the Real World App: business-analyst user story with Gherkin acceptance criteria (student checkpoint), then backend (be-dev), frontend (fe-dev), a risk-based test plan (qa-lead), API/UI automation and/or an e2e journey, docs and code review. Use when a student asks for a new capability that spans API and UI, e.g. 'let users add a note to a transaction' or 'add a favourite contacts feature'."
argument-hint: "<feature idea, e.g. 'users can mark a contact as favourite'>"
allowed-tools: Bash(git status *), Bash(head *)
---

# /tap-feature — story → API → UI → tests → docs

## Goal
Take a feature idea to a reviewed, tested, documented vertical slice, with acceptance criteria agreed
with the student before any code is written and traceability from each criterion to a test.

## Inputs
- `$ARGUMENTS` — the whole text is the feature idea.
- Empty → ask: "What should a user be able to do, and why? (one sentence is enough)".
- Large ideas: the business-analyst splits them; this run implements only the first story.

State at invocation (read-only): !`git status --short 2>/dev/null | head -20 || true`

## Steps
Create a todo list mirroring these steps. Every agent ends with the standard hand-off report.

1. **Story** — delegate to `business-analyst` with: "Write a user story for: $ARGUMENTS. Use the story
   template in `tap26/templates/`. Include persona, value, scope / out-of-scope, Gherkin acceptance
   criteria (Given/When/Then, ids AC-1…, at least one negative/edge case), data and API/UI touchpoints
   in this repo (`backend/*-routes.ts`, `src/containers/*`). Save to `tap26/reports/ba/ba-<YYYYMMDD-HHmm>-<slug>-stories.md`."
2. **CHECKPOINT — stop and ask the student.** Show the story and the ACs and ask: "Approve, or what
   should change?" Do not continue until the student approves (edits go back to `business-analyst`).
3. **Backend** — delegate to `be-dev`: "Implement the API part of `<story path>` in `backend/`
   (routes, validators, `database.ts`, types, GraphQL if relevant). Update `tap26/openapi/openapi.yaml`
   for every new/changed endpoint. Verify with `yarn types` and `curl -i` (log in via `POST /login`).
   Log each file: `node tap26/scripts/memory.mjs log-change <file> \"<summary>\" --by be-dev`."
   Then delegate to `contract-guardian`: regenerate `openapi.json`
   (`npx --yes js-yaml tap26/openapi/openapi.yaml > tap26/openapi/openapi.json`), lint
   (`npx --yes @redocly/cli@1 lint tap26/openapi/openapi.yaml`), drift (`node tap26/scripts/spec-drift.mjs`).
4. **Frontend** — delegate to `fe-dev`: "Implement the UI part of `<story path>` in `src/`, consuming the
   new API, with `data-test` on every new interactive element; preserve existing ids. Verify with `yarn types`
   and a render check on http://localhost:3000." (Ask `ux-designer` first if the story has no UI detail.)
5. **Test plan** — delegate to `qa-lead`: "Write a risk-based test plan for `<story path>` mapping each AC
   to a test level (api / ui / e2e / manual) with a traceability matrix; save to
   `tap26/reports/test-plans/test-plan-<YYYYMMDD-HHmm>-<slug>.md`. Decide whether an e2e journey is warranted." `qa-lead` may
   itself delegate to automation agents; otherwise continue with step 6.
6. **Automation** (parallel where independent):
   - `api-automation`: API ACs → `playwright/tests/api/<area>.api.spec.ts` (+ `playwright/src/api/*`).
   - `ui-automation`: UI ACs → `playwright/tests/ui/<area>.spec.ts` (desktop; mobile if layout).
   - `e2e-architect` (only if the plan says so): journey in `playwright/tests/e2e/` (see `/tap-e2e`).
   Each runs its specs with `--repeat-each=2` from `playwright/` and `npm run typecheck`.
   Test titles reference AC ids, e.g. `test("AC-2 rejects an empty note", …)`.
7. **Docs** — delegate to `doc-writer`: feature how-to in `tap26/docs/`, release-notes entry, API guide
   section if endpoints were added, `node tap26/scripts/scan-app.mjs` to refresh knowledge.
8. **Review** — delegate to `code-reviewer`: review the full `git diff` against the story, ACs, BLUEPRINT §7
   and test conventions. Loop findings back once.

## Quality gates
- Story approved by the student before step 3 (record "approved by student" in the story file).
- Gate 1: app starts; `yarn types` passes.
- Gate 2: OpenAPI updated, `openapi.json` regenerated, lint clean, `spec-drift` clean; API tests green.
- Gate 3: `data-test` contract preserved; UI tests green (desktop; mobile if layout touched).
- Gate 4: all new tests pass 2× in a row; `npm --prefix playwright run typecheck` clean; functional style.
- Gate 5: docs + ledger updated. Gate 6: `code-reviewer` approve.
- Traceability: every AC maps to ≥ 1 passing test or an explicit manual check in the plan.

## Output
```
Feature     <title>                    story: tap26/reports/ba/ba-<YYYYMMDD-HHmm>-<slug>-stories.md
ACs         AC-1 ✓ api  AC-2 ✓ ui  AC-3 ✓ e2e  AC-4 ◻ manual
Backend     <files>   Contract ✓ drift ✓
Frontend    <files>   selectors +n
Tests       api n/n ×2 · ui n/n ×2 · e2e n/n ×2
Plan/Docs   <paths>
Review      approve
```
Plus "How this was done" (agent order and why) and a suggestion to try one AC yourself (lab-12).

## Memory
- `node tap26/scripts/memory.mjs set-active "tap-feature: <title> — <stage>"` at start and after each stage.
- `log-change` per app file (be-dev/fe-dev); `add-decision` for scope or design choices agreed at the checkpoint.
- New domain terms → append to `tap26/memory/glossary.md` via `doc-writer`.
- End: `memory.mjs add-learning` for anything surprising, then `node tap26/scripts/memory.mjs digest`.

## Learn more
- `tap26/docs/06-workflows.md` (feature slice), `tap26/docs/03-agents.md`, `tap26/docs/12-prompting-guide.md`
- Labs: `tap26/labs/lab-04` (ask roles), `lab-07` (API change), `lab-08` (UI change), `lab-12` (e2e journey)
