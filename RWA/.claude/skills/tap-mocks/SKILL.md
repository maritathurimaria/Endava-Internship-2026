---
name: tap-mocks
description: "Generate mocks, stubs, factories and fixtures with the mock-smith: mock-server scenarios for the spec-driven mock API on :3101 (tap26/mocks/scenarios), Playwright route stubs and data factories (playwright/src/mocks) and JSON fixtures. Use when a student wants to test an error/empty/slow state the real API cannot easily produce, isolate the UI from the backend, or build test data, e.g. 'stub GET /transactions/public to return 500' or 'create a user factory'."
argument-hint: "server <scenario> | stub <METHOD /endpoint> <state> | factory <entity> | fixture <entity>"
allowed-tools: Bash(ls *)
---

# /tap-mocks — mock server scenarios, stubs, factories, fixtures

## Goal
Produce exactly the test double the student needs — at the right layer — that matches the OpenAPI
contract, is reusable, and is demonstrated by at least one passing usage.

## Inputs
Parse `$ARGUMENTS` (the whole input text) yourself: its **first word is the kind**
(`server|stub|factory|fixture`); **everything after it is the target and state as free text** (e.g.
`"GET /notifications" empty` → target `GET /notifications`, state `empty`). If the first word is not a
kind, infer the kind from the text and say so.
| kind | form | produces |
|---|---|---|
| `server` | `server <scenario>` e.g. `server bank-accounts-empty` | scenario file in `tap26/mocks/scenarios/` for `tap26/scripts/mock-server.mjs` (:3101) |
| `stub` | `stub <METHOD /endpoint> <state>` e.g. `stub "GET /notifications" empty` | Playwright stub builder in `playwright/src/mocks/` using `stubApi`/`transformApi` from `@ui` |
| `factory` | `factory <entity>` e.g. `factory transaction` | typed, deterministic data factory in `playwright/src/mocks/factories.ts` |
| `fixture` | `fixture <entity>` e.g. `fixture public-transactions` | JSON fixture in `playwright/test-data/` (or `tap26/mocks/fixtures/` for the mock server) |
Common states: `empty`, `error-500`, `unauthorized-401`, `validation-422`, `slow` (delay), `large` (pagination), `happy`.
Empty `$ARGUMENTS` → list existing scenarios/stubs/factories (below) and ask which kind is needed.

Existing artefacts (read-only):
- Scenarios: !`ls tap26/mocks/scenarios 2>/dev/null || true`
- Playwright mocks: !`ls -R playwright/src/mocks 2>/dev/null || true`
(empty output = the folder does not exist yet)

## Steps
1. **Contract first** — delegate to `mock-smith` with: "Kind: <kind = first word of the request>.
   Target and state: <the request minus its first word, verbatim>. Full request: $ARGUMENTS. Look up the endpoint/entity in `tap26/openapi/openapi.yaml` and the
   domain types in `playwright/src/types/models.ts` so every mocked body matches the schema
   (field names, types, amounts in cents, ISO dates in UTC). If the spec and the types disagree,
   stop and report — that is drift for `contract-guardian`."
2. **Build the artefact** — same `mock-smith` brief, per kind:
   - `server`: create `tap26/mocks/scenarios/<scenario>.json` following the format of existing scenarios
     and the header of `tap26/scripts/mock-server.mjs`. Demonstrate: start the mock server if :3101 is down
     (`node tap26/scripts/mock-server.mjs`, background) and call it with the scenario, e.g.
     `curl -s -H "x-mock-scenario: <scenario>" http://localhost:3101/<path>` or `?__scenario=<scenario>`.
   - `stub`: add a pure function to `playwright/src/mocks/stubs.ts`, e.g.
     `export const stubNotificationsEmpty = (page: Page) => stubApi(page, { method: "GET", path: "/notifications" }, { results: [] })`
     (match the `ApiMatcher` shape in `playwright/src/ui/network.ts`); export it from `playwright/src/mocks/index.ts`.
     If `playwright/src/mocks` is new, add the aliases `"@mocks": ["src/mocks/index.ts"]` and
     `"@mocks/*": ["src/mocks/*"]` to `compilerOptions.paths` in `playwright/tsconfig.json` (same pattern as `@ui`).
   - `factory`: `playwright/src/mocks/factories.ts` exporting `build<Entity>(overrides?: Partial<T>): T`
     — pure, deterministic (counter-based ids), frozen result, no I/O; optional `build<Entity>List(n, overrides)`.
   - `fixture`: deterministic JSON (no random values) validated against the schema; name by entity + state.
   Functional style everywhere: no classes, no shared mutable state.
3. **Prove it** — `mock-smith` (or `ui-automation` for UI stubs) writes or updates ONE usage:
   a UI test that uses the stub/fixture (e.g. empty-state message is shown) in `playwright/tests/ui/`, or
   an API-level usage of a factory, then runs
   `cd playwright && npx playwright test <file> -g "<title>" --project=ui-desktop --repeat-each=2` and `npm run typecheck`.
   For `server`, the curl output in step 2 is the proof.
4. **Document** — delegate to `doc-writer`: add the scenario/stub/factory to the catalogue table in
   `tap26/docs/09-mocks-and-stubs.md` (name, layer, state, how to use).

## Quality gates
- Mocked data matches the OpenAPI schema and `models.ts` types; typecheck clean.
- Gate 4: any new/changed test passes 2× in a row; functional style; no hard waits.
- E2E journeys must NOT use API stubs (a stubbed journey is not end-to-end) — stubs are for UI-state tests.
- Mock server scenario answers with the expected status/body for the documented request.

## Output
```
Kind       <server|stub|factory|fixture>   target: <…>   state: <…>
Files      <paths>
Proof      <curl result | test title passed 2/2>
Use it     <one-line usage snippet>
Docs       tap26/docs/09-mocks-and-stubs.md
```
Plus one sentence on when to prefer this double over the real API (teaching).

## Memory
- New scenario/stub/factory → `node tap26/scripts/memory.mjs add-fact mocks "<name> (<layer>) simulates <state> for <endpoint>" --by mock-smith`
- Spec/type mismatch found → `node tap26/scripts/memory.mjs add-question "Spec vs models.ts mismatch for <entity>: <detail>" --by mock-smith`

## Learn more
- `tap26/docs/09-mocks-and-stubs.md`, `tap26/docs/08-api-contract-and-swagger.md`, `playwright/README.md` (stubApi / transformApi)
- Lab: `tap26/labs/lab-11` (mocks)
