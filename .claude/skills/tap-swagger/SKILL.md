---
name: tap-swagger
description: "Work with the RWA API contract through the contract-guardian: regenerate tap26/openapi/openapi.json from openapi.yaml, lint it with Redocly, check spec-to-code drift against the Express routes, serve Swagger UI on http://localhost:3100 and explain how to use Try it out with the session cookie. Use when a student says 'open swagger', 'is the spec up to date', 'regenerate the openapi json', 'check drift' or after an API change."
argument-hint: "[all|regen|lint|drift|serve]  (default: all)"
allowed-tools: Bash(ls *), Bash(git status *), Bash(node tap26/scripts/*), Bash(npx --yes js-yaml *), Bash(npx --yes @redocly/cli@1 lint *)
---

# /tap-swagger — OpenAPI regen, lint, drift, Swagger UI

## Goal
Keep `tap26/openapi/openapi.yaml` (source of truth) and its generated `openapi.json` valid and in
sync with the real Express routes, and give the student a working Swagger UI to explore the API.

## Inputs
The **action** is the first word of `$ARGUMENTS` (the whole input text), default `all`:
- `regen` — YAML → JSON only.
- `lint` — Redocly lint only.
- `drift` — spec ↔ code drift only.
- `serve` — start Swagger UI only (plus the app if needed).
- `all` / empty — regen → lint → drift → serve.
Everything after the first word (free text, e.g. an endpoint like `/bankAccounts`) narrows the drift
discussion and the Try-it-out walkthrough to that endpoint. If the first word is not an action, use `all`.

Spec state at invocation (read-only):
- Files (newest first — if `openapi.yaml` is listed above `openapi.json`, the JSON is stale): !`ls -lt tap26/openapi 2>/dev/null || true`
- !`git status --short -- tap26/openapi backend 2>/dev/null || true`

## Steps
Delegate steps 1–3 to the `contract-guardian` agent in one brief (they are sequential), then step 4.

1. **Regenerate JSON** (never hand-edit the JSON):
   `npx --yes js-yaml tap26/openapi/openapi.yaml > tap26/openapi/openapi.json`
   then sanity-check it parses: `node -e "JSON.parse(require('fs').readFileSync('tap26/openapi/openapi.json','utf8'))"`.
   If js-yaml reports a YAML error, fix the YAML (line number is in the error) and re-run.
2. **Lint**: `npx --yes @redocly/cli@1 lint tap26/openapi/openapi.yaml`
   Errors must be fixed; warnings are listed with a recommendation (fix now vs record as follow-up).
   Typical fixes: missing `operationId`, missing 4xx response, example not matching schema.
3. **Drift**: `node tap26/scripts/spec-drift.mjs` — compares OpenAPI paths/methods with the Express
   routes scanned from `backend/*-routes.ts` (and `backend/app.ts` mounts).
   - *Missing in spec* (route exists in code): document it in the YAML (schemas from `backend/types.ts`,
     validators from `backend/validators.ts`), verify by calling the endpoint with `curl -i`.
   - *Extra in spec* (no route in code): confirm with `grep -rn "<path>" backend` before removing;
     ask the student if the endpoint was intentionally removed.
   - After fixes, repeat steps 1–3 until drift is clean.
   Optional deeper check: ask `contract-guardian` to compare one response from the running API with
   its schema (e.g. `GET /testData/users`).
4. **Serve Swagger UI** — delegate to `env-ops`: if :3001 is down, start the app as in `/tap-run`; if :3100
   is down, start `node tap26/scripts/swagger-server.mjs` as a background process and wait with
   `npx wait-on --timeout 30000 http-get://localhost:3100`. Do not start a second copy if :3100 is up.

Explain **Try it out** to the student:
1. Open http://localhost:3100 and keep the server dropdown on **`/api`** (same-origin proxy to :3001 —
   the direct `http://localhost:3001` server is blocked by CORS in the browser).
2. Optional reset: `POST /testData/seed` → Execute (wipes manual data).
3. `POST /login` → body `{"username": "<seeded user>", "password": "s3cret"}` → Execute → 200.
   The browser now stores the `connect.sid` cookie for :3100, so it is sent on every later call.
   Get a username from `GET /testData/users` (public) — the first result is fine.
4. Call protected endpoints (lock icon), e.g. `GET /checkAuth`, `GET /bankAccounts`, `GET /transactions`.
   A 401 means step 3 was skipped or the cookie expired — log in again.

## Quality gates
- Gate 2 (contract part): `openapi.json` regenerated from the current YAML; Redocly lint 0 errors;
  `node tap26/scripts/spec-drift.mjs` reports no missing/extra operations.
- No edits to `backend/` from this skill — code/spec disagreements where the **code** is wrong go to `be-dev`
  via `/tap-change-api` or `/tap-debug`.
- Swagger UI answers on http://localhost:3100 and `POST /login` via `/api` returns 200 (when `serve` ran).

## Output
```
Regen   openapi.json ✓ (n paths, n operations)
Lint    0 errors · n warnings  (top warnings + recommendation)
Drift   clean | missing in spec: … | extra in spec: …  → fixed n
Serve   Swagger UI http://localhost:3100   (server: /api → :3001)
Next    POST /login in Try it out, then explore; or /tap-mocks server <scenario>
```
Include the `contract-guardian` hand-off (Status / Changed files / Verification).

## Memory
- Spec changed → `node tap26/scripts/memory.mjs log-change tap26/openapi/openapi.yaml "<summary>" --by contract-guardian`
- Drift found and fixed → `node tap26/scripts/memory.mjs add-learning "Spec drift: <path>" --what "<missing/extra>" --lesson "<why it drifted>" --tags openapi,drift --applies contract-guardian,be-dev --by contract-guardian`
- Intentional spec/code differences → `memory.mjs add-decision "<title>" --context "<t>" --decision "<t>" --by contract-guardian`

## Learn more
- `tap26/docs/08-api-contract-and-swagger.md`, `tap26/docs/09-mocks-and-stubs.md`
- Lab: `tap26/labs/lab-10` (swagger)
