---
name: tap-change-api
description: "Implement a change to the Real World App API end-to-end: backend code (Express routes, validators, lowdb, GraphQL), OpenAPI spec + spec-drift check, test impact analysis, Playwright API (and UI if consumed) tests, docs and an independent code review, recorded in the change ledger. Use when a student asks to add/change/remove an endpoint, field, validation rule or response, e.g. 'add a note field to bank accounts' or 'make GET /users/search return 422 for an empty q'."
argument-hint: "<API change to make, e.g. 'add optional nickname to POST /bankAccounts'>"
allowed-tools: Bash(git status *), Bash(head *)
---

# /tap-change-api — API change with spec, tests, docs and review

## Goal
Ship the requested API change with everything that must move with it: OpenAPI contract, regenerated
JSON, green API tests (and UI tests when the UI consumes the endpoint), docs, a ledger entry and a review.

## Inputs
- `$ARGUMENTS` — the whole text is the change request in plain words (do not split it into words).
- Empty → ask: "Which endpoint or entity, and what should change (request, response, validation, status code)?"
- If the request is ambiguous in a way that changes the work (which endpoint, breaking vs additive,
  which user role), ask ONE question, otherwise state your interpretation and proceed.

State at invocation (read-only): !`git status --short 2>/dev/null | head -20 || true`

## Steps
Create a todo list with one item per step. Steps 1→7 are sequential; each agent must end with the
standard hand-off (`## Hand-off — <agent>` / Status / Changed files / Verification / Risks / Memory / Next).

1. **Implement** — delegate to `be-dev` with: "Change request: $ARGUMENTS. Touch only `backend/`
   (routes `backend/*-routes.ts`, `backend/validators.ts`, `backend/database.ts`, `backend/types.ts`,
   GraphQL in `backend/graphql/`). Keep the change additive unless told otherwise. Update the seed
   generator only after asking. Verify: `yarn types`; the API reloads (nodemon) and a `curl -i` of the
   changed endpoint (login first via `POST /login`) shows the new behaviour. Log intent:
   `node tap26/scripts/memory.mjs log-change <file> \"<summary>\" --by be-dev`."
2. **Contract** — delegate to `contract-guardian` with: "Update `tap26/openapi/openapi.yaml` for the
   be-dev change (paths, schemas, examples, error responses). Then run
   `npx --yes js-yaml tap26/openapi/openapi.yaml > tap26/openapi/openapi.json`,
   `npx --yes @redocly/cli@1 lint tap26/openapi/openapi.yaml`, and `node tap26/scripts/spec-drift.mjs`.
   Drift must be clean (no missing/extra path+method)."
3. **Impact** — delegate to `test-impact-analyst` with: "Run `node tap26/scripts/impact.mjs` and read
   `tap26/memory/changes.md`. List impacted routes, the Playwright specs that reference them
   (`playwright/tests/api/*.api.spec.ts`, `playwright/src/api/*.ts`, `playwright/src/api/endpoints.ts`),
   UI screens that consume the endpoint (search `src/` for the path), and an update plan per agent."
4. **API tests** — delegate to `api-automation` with the impact plan: "Update/add functional-style tests
   in `playwright/tests/api/`, adding or changing the route function in `playwright/src/api/<area>.ts` and
   `endpoints.ts`, types in `playwright/src/types/models.ts`. Cover the happy path + at least one
   negative case (e.g. 422 with `errorsOf`). Run `cd playwright && npx playwright test --project=api --repeat-each=2`
   for the touched specs and `npm run typecheck`."
5. **UI tests (conditional)** — only if step 3 found UI consumers: delegate to `ui-automation` to update
   `playwright/tests/ui/` and run `--project=ui-desktop --repeat-each=2` on the touched specs.
   Steps 4 and 5 may run in parallel.
6. **Docs** — delegate to `doc-writer`: update `tap26/docs/08-api-contract-and-swagger.md` if the
   contract story changed, add a dated entry to the release notes / changelog in `tap26/docs/`, and
   refresh knowledge with `node tap26/scripts/scan-app.mjs`.
7. **Review** — delegate to `code-reviewer` with: "Review `git diff` for backend, spec, tests and docs
   against BLUEPRINT §7 and `playwright/README.md` conventions. Verdict: approve | changes requested."
   If changes are requested, send them back to the owning agent and repeat the review once.

## Quality gates
1. App still starts (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/testData/users` → 200) and `yarn types` passes.
2. `tap26/openapi/openapi.yaml` updated, `openapi.json` regenerated, Redocly lint has no errors,
   `node tap26/scripts/spec-drift.mjs` clean.
3. Impacted API tests updated and green; UI tests green when the UI consumes the endpoint.
4. New/changed tests pass 2× (`--repeat-each=2`), `npm --prefix playwright run typecheck` clean, no classes/page objects.
5. Docs updated; change recorded in `tap26/memory/changes.md` (hook + `log-change` intent line).
6. `code-reviewer` verdict approve (or findings resolved).
No assertion is weakened to make a test pass.

## Output
Summarise for the student (≤ 25 lines):
```
Change      <one line>
Backend     <files>                         yarn types ✓  curl ✓
Contract    openapi.yaml/json               lint ✓  drift ✓
Tests       <specs>  api n/n ×2 ✓  ui n/n ×2 ✓ (or n/a)
Docs        <files>
Review      approve | n findings resolved
```
Then "How this was done" (agents in order and why) and one thing to try yourself (lab-07).

## Memory
- `node tap26/scripts/memory.mjs log-change <file> "<intent>" --by <agent>` for every app file (be-dev does this).
- Contract or design choice (breaking vs additive, status code) → `memory.mjs add-decision "<title>" --context "<t>" --decision "<t>" --by tap-orchestrator`.
- `node tap26/scripts/memory.mjs set-active "tap-change-api: <request> — done"` then `node tap26/scripts/memory.mjs digest`.
- Surprises → `memory.mjs add-learning "<title>" --lesson "<t>" --applies be-dev,contract-guardian --by knowledge-curator`.

## Learn more
- `tap26/docs/06-workflows.md` (change → tests → docs), `tap26/docs/08-api-contract-and-swagger.md`, `tap26/docs/07-testing-framework.md`
- `playwright/README.md` (Adding a test)
- Labs: `tap26/labs/lab-07` (API change), `lab-09` (sync tests), `lab-10` (swagger)
