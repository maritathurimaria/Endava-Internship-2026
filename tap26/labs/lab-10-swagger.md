# Lab 10 — The API contract: Swagger UI, drift and contract tests

**Level:** ★★☆ · **Time:** 45–60 min · **Tracks:** Tester, Developer, Full
**Skills/agents practised:** `/tap-run swagger`, `/tap-swagger regen|drift`, `/tap-new-test`, `/tap-bug` · `contract-guardian`, `api-automation`, `manual-tester`

## Learning objectives

1. Explore and call the RWA API from Swagger UI with a real login session.
2. Read `tap26/openapi/openapi.yaml` with VS Code's OpenAPI and YAML tooling.
3. Create drift on purpose, detect it with `spec-drift.mjs`, and have `contract-guardian` repair it.
4. Extend the existing contract test suite, which validates live responses against the spec.

## Prerequisites

- [Lab 05](lab-05-first-api-test.md). App running.

## Background

`tap26/openapi/openapi.yaml` is the **source of truth** for the API contract; `openapi.json` is
generated from it. It documents the API's *actual* behaviour, including known defects (see
`tap26/knowledge/known-issues.md`, ids `KI-01…`). `swagger-server.mjs` serves Swagger UI on
**:3100** and proxies `/api/*` to the API on :3001 from the same origin, so the session cookie from
`POST /login` works in *Try it out*. `spec-drift.mjs` compares documented paths+methods with the Express
routes in `backend/` (exit 0 = in sync, 1 = drift).

## Steps

### 0. Branch

```bash
git switch -c lab/10-swagger
```

### 1. Start Swagger UI

```
/tap-run swagger
```

(or task **TAP: Swagger UI**). Open http://localhost:3100.

### 2. Log in and call a protected endpoint

In Swagger UI:

1. `POST /login` → *Try it out* → body `{"username":"Heath93","password":"s3cret"}` → *Execute* → 200.
2. `GET /checkAuth` → *Execute* → 200 with Ted's user object. Copy his `id`.
3. `GET /transactions` with `limit=5` → 200 and `pageData.limit` = 5.
4. `GET /bankAccounts/{bankAccountId}` with a made-up id like `abc123XYZ` → note the status and body.

**Observe:** compare step 4 with the spec's documented responses for that operation and with KI-10.

### 3. Read the spec in VS Code

Open `tap26/openapi/openapi.yaml`.

- The **YAML** extension validates it against the OpenAPI 3.0 schema (configured in
  `.vscode/settings.json` → `yaml.schemas`). Problems appear in the *Problems* panel (`Ctrl+Shift+M`).
- The **OpenAPI (42Crunch)** extension adds an *OpenAPI* explorer in the activity bar — browse
  paths and schemas, jump to `components/schemas`.

Ask the guardian to explain one operation:

```
/tap-ask api-auto read the OpenAPI operation for PATCH /users/{userId} and list every documented response code with the known issue it relates to
```

### 4. Create drift on purpose

In `openapi.yaml`, find the `/bankTransfers:` path item and **comment out** the whole block (select it,
`Ctrl+/`). Then:

```
/tap-swagger regen
```

```
/tap-swagger drift
```

**Expected:** a report listing `GET /bankTransfers` as *implemented but undocumented*, exit code 1.
The contract tests notice too. In `playwright/`, run
`npx playwright test tests/api/contract.api.spec.ts --project=api -g bankTransfers`: the
`GET /bankTransfers` case fails because the operation is no longer in `openapi.json`. Now repair it:

```
Use the contract-guardian agent to fix the drift: restore the /bankTransfers documentation from the implementation in backend/banktransfer-routes.ts, regenerate openapi.json and re-run the drift check.
```

### 5. Extend the contract tests

The framework already has a contract suite: `playwright/tests/api/contract.api.spec.ts` calls the main
GET endpoints and validates status and body against `tap26/openapi/openapi.json` with
`validateResponse` from `@api/contract` (see *Contract tests* in `playwright/README.md`). Read it first.
It only checks a logged-in session plus one anonymous `GET /checkAuth`. Add the documented **401** responses:

```
/tap-new-test api in playwright/tests/api/contract.api.spec.ts add contract tests for the documented 401 responses of GET /bankAccounts, GET /notifications and GET /transactions without a session. Follow the existing anonymous GET /checkAuth test (fresh request context, validateResponse from @api/contract), keep it data-driven, and add zero new dependencies.
```

### 6. File a contract bug

```
/tap-bug KI-10: GET /bankAccounts/{unknown id} returns 200 with {} instead of 404
```

## ✅ Checkpoints

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Swagger UI up | `node -e "fetch('http://localhost:3100').then(r=>console.log(r.status))"` | `200` |
| 2 | Proxy works | `node -e "fetch('http://localhost:3100/api/checkAuth').then(r=>console.log(r.status))"` | `401` (not logged in from Node) |
| 3 | Drift clean | `node tap26/scripts/spec-drift.mjs` | exit 0, nothing missing/undocumented |
| 4 | JSON matches YAML | `node -e "console.log(Object.keys(require('./tap26/openapi/openapi.json').paths).includes('/bankTransfers'))"` | `true` |
| 5 | Contract tests green ×2 | in `playwright/`: `npx playwright test tests/api/contract.api.spec.ts --project=api --repeat-each=2` | `0 failed` |
| 5b | New 401 cases exist | in `playwright/`: `npx playwright test tests/api/contract.api.spec.ts --project=api --list -g 401` | at least 4 tests listed (the existing `/checkAuth` one + your 3) |
| 6 | No new deps | `git diff tap26-base -- playwright/package.json` | no output |

## Stretch goals

- Run *Security Audit* from the 42Crunch extension on `openapi.yaml`. Which findings are real for this
  app (e.g. no auth scheme on `/contacts/{username}`, KI-08) and which are noise?
- Ask `contract-guardian` to add `example` values for `POST /transactions` and verify them by calling the API.
- Add a contract case for a documented **422** (e.g. `GET /users/{userId}` with an invalid id). Does the
  documented error schema match what the API really returns?

## Reflection questions

1. The spec documents defects as actual behaviour. When is that the right choice, and when should the
   spec describe the *intended* behaviour instead?
2. `spec-drift` only checks paths and methods. What kinds of drift can it never see, and who catches them?
3. Did the agent regenerate `openapi.json`, or only edit the YAML? How did you check?
4. Swagger UI vs. agent-run requests: which gave you more confidence, and why?

## Reset

```bash
git restore data/database.json
git add -A && git commit -m "lab 10: drift exercise + contract test"
git switch tap26-base
```

Stop Swagger UI when done: stop the task (trash icon in the terminal) or `Ctrl+C`.

## Instructor notes

- If *Try it out* gets 401 after login, the student is calling `http://localhost:3001` directly instead
  of the `/api` server entry — check the *Servers* dropdown in Swagger UI.
- Regenerating JSON may use `npx --yes js-yaml`, which needs network on first use; offline classrooms
  should pre-warm the npx cache.
- Commenting out with `Ctrl+/` in YAML works line by line; if students delete the block instead,
  `git diff` shows exactly what the guardian must restore — a good comparison for its repair.
- Contract test sketch: a `for` loop over `["/bankAccounts", "/notifications", "/transactions"]` that
  creates a fresh context with `playwright.request.newContext()` (no `me` fixture), calls `get(anonymous, path)`,
  expects 401 and `validateResponse(contract, "GET", path, 401, res.body).errors` to equal `[]`. Agents that
  request the `me` fixture get 200, not 401. Watch for that.
