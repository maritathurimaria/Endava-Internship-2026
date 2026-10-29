# TAP26 mocks

Test doubles for the Real World App API: a **spec-driven mock server**, named **scenarios**, and
**fixtures** taken from the seed. Use them to explore API states you can't easily reach with real data
(empty, slow, failing, brand-new user), to demo the API without touching the database, or to run the
UI with no backend at all.

```
tap26/mocks/
├── README.md               this file
├── build-fixtures.mjs      regenerates fixtures/ from data/database-seed.json
├── fixtures/               API-shaped JSON bodies (deterministic, no password hashes)
└── scenarios/              named states for the mock server and for Playwright (withScenario)
tap26/scripts/mock-server.mjs   the server (zero dependencies; `--help` prints its full usage)
```

## Run it

```bash
node tap26/scripts/mock-server.mjs                 # :3101, answers with the OpenAPI examples
node tap26/scripts/mock-server.mjs --stateful      # :3101, in-memory copy of the seed data
node tap26/scripts/mock-server.mjs --port 3111 --scenario empty-notifications
```

| Option | Env | Default | Meaning |
| --- | --- | --- | --- |
| `--port` | `MOCK_PORT` | `3101` | Listen port. A busy port prints a clear message and exits 1 |
| `--stateful` | `MOCK_STATEFUL=1` | off | Seed-backed data that you can change (see below) |
| `--scenario <name[,name]>` | `MOCK_SCENARIO` | — | Server-wide default scenario |
| `--as <username>` | `MOCK_USER` | — | Stateful: default identity when there is no session |
| `--spec <file>` | — | `tap26/openapi/openapi.json` | Spec to serve. It is re-read whenever the file changes |

Every request is logged as `METHOD path → status [scenario] (source)`, and the source tells you where
the answer came from: `example`, `example:<name>`, `stateful`, `scenario:<file>` or `builtin`. Responses
also carry the headers `x-mock-route`, `x-mock-scenario` and `x-mock-source`.
`GET /__mock/routes` lists all 35 operations and every scenario.

## Default mode: answers from the contract

The server matches the method and path against the spec's path templates (static segments win, so
`/users/search` beats `/users/{userId}`) and returns the lowest documented 2xx response. The body comes
from the first source that exists:

1. a named example from `examples`. Without a choice it takes the first one. Choose with `?__example=<name>`
   or the `x-mock-example` header. For `POST /graphql`, the request's `operationName` picks the example
   (`ListBankAccount`, `CreateBankAccount`, `DeleteBankAccount`)
2. the media type's `example`
3. the schema's `example`
4. a body built from the schema (properties, enums, formats, `$ref`, `allOf`/`oneOf`)

> **PowerShell users:** use `curl.exe` instead of `curl` (in PowerShell `curl` is an alias for
> `Invoke-WebRequest` and rejects these flags), or run the commands in Git Bash. This applies to every `curl` example on this page.

```bash
curl -s localhost:3101/users/uBmeaz5pX                          # documented User example
curl -s "localhost:3101/users/profile/x?__example=notFound"      # {"user":{}}
curl -s -X DELETE localhost:3101/users                           # 405, Allow: GET, POST
```

## Scenarios

Pick a scenario per request with the header `x-mock-scenario: <name>` or the query `?__scenario=<name>`.
For a server-wide default use `--scenario`, or set one at runtime with
`POST /__mock/scenario {"name":"…"}` (`""` clears it). You can combine names with commas, for example
`slow,empty`.

| Built-in | Effect |
| --- | --- |
| `status-<code>` | The documented response for that status, e.g. `status-401` → `{"error":"Unauthorized"}`. An undocumented code gets a generic `{error, status}` |
| `empty` | Empties every array (`results: []`); `pageData` becomes `{page:1, hasNextPages:false, totalPages:0}` |
| `slow` | Adds 2000 ms. `?__delay=<ms>` or `x-mock-delay: <ms>` adds any delay, with or without a scenario |
| `error` | `500 {"error":"Internal Server Error"}` for every request |

| File scenario (`scenarios/*.json`) | State |
| --- | --- |
| `empty-notifications` | `GET /notifications` → `{ results: [] }` |
| `server-error-transactions` | All transaction reads (feeds and by id) → 500 |
| `slow-feeds` | The three feeds answer after 3 s with their normal body |
| `validation-error-signup` | `POST /users` → 422 with express-validator `errors` |
| `new-user-onboarding` | No bank accounts (REST + GraphQL `ListBankAccount`), no transactions, no notifications |
| `bank-accounts-empty` | No bank accounts (REST + GraphQL) |

```bash
curl -s -H "x-mock-scenario: empty-notifications" localhost:3101/notifications
curl -s "localhost:3101/transactions/public?__scenario=server-error-transactions"   # 500
curl -s -H "x-mock-scenario: status-422" localhost:3101/users/abc
```

A scenario file is read fresh on every request, so you don't need to restart the server. An unknown
name returns 400 with the list of available scenarios. A request that matches none of a scenario's
routes gets its normal answer, so a server-wide scenario only changes what it names.

```json
{
  "name": "empty-notifications",
  "description": "What the state means for the UI.",
  "routes": [
    { "method": "GET", "path": "/notifications", "status": 200, "body": { "results": [] }, "delayMs": 0, "headers": {} }
  ]
}
```

`path` takes a spec template (`/users/{userId}`) or a concrete path, and `method: "*"` matches any method.
Without a `body` the route returns the documented example for `status`. `"fixture": "users.json"` serves a
file from `fixtures/` instead. `"operationName": "ListBankAccount"` narrows a `POST /graphql` route to one
operation. Name new scenarios `<resource>-<state>`.

## Stateful mode (`--stateful`)

An in-memory copy of `data/database-seed.json` backs the main resources. Login/logout/checkAuth use a
`connect.sid` cookie. Users (list, search, by id, profile, create, update) are covered, and so are the
three transaction feeds with real `pageData` pagination and the date/amount/status filters. Transactions
by id, create and update move money between balances and create notifications. Bank accounts work over
REST and over GraphQL `ListBankAccount`/`CreateBankAccount`/`DeleteBankAccount`. Bank transfers,
contacts, notifications (list, mark read, bulk), likes, comments and `testData` are covered too. Writes
(POST/PATCH/DELETE) change only the copy, never `data/database.json`. A route that isn't modelled falls
back to the examples.

- **Identity:** the `connect.sid` cookie from `POST /login` (any seeded user + `s3cret`), else the header
  `x-mock-user: <username|id>`, else `--as <username>`. With none of these, protected routes answer 401,
  as the real API does.
- **Reset:** `POST /__mock/reset` (or `POST /testData/seed`) restores the seed and drops sessions.
- **Fidelity:** with the seed loaded and logged in as `Heath93`, 22 of 22 GET responses (all feeds and
  pages, filters, bank accounts, transfers, contacts, notifications, likes, comments, testData) were
  byte-identical to the real API, and so was GraphQL `ListBankAccount` (verified 2026-10-16).
- **Simplified on purpose:** validation is minimal (missing fields → 422). Unknown query keys are
  ignored rather than used as filters (the real API's KI-22). Unknown ids give 500 text (KI-10) or 422.
  Mock ids look like `mock00001abc`.

```bash
curl -s -c jar -H 'content-type: application/json' -d '{"username":"Heath93","password":"s3cret"}' localhost:3101/login
curl -s -b jar -H 'content-type: application/json' \
  -d '{"transactionType":"payment","receiverId":"GjWovtg2hr","amount":25,"description":"pizza"}' localhost:3101/transactions
curl -s -H "x-mock-user: Arvilla_Hegmann" localhost:3101/notifications    # the receiver got a notification
curl -s -X POST localhost:3101/__mock/reset
```

## Point the real UI at the mock

The frontend builds every API URL as `http://localhost:${process.env.VITE_BACKEND_PORT}`
(`src/utils/portUtils.ts`). `vite.config.ts` loads `VITE_*` variables with `loadEnv`, and a value from
the shell environment overrides the `.env` file. The mock reflects any `Origin` with credentials and
answers preflights, so CORS is not a problem.

```bash
# 1. stop `yarn dev` (both servers use :3000), then:
node tap26/scripts/mock-server.mjs --stateful            # terminal 1
VITE_BACKEND_PORT=3101 yarn start:react                   # terminal 2 — UI only, http://localhost:3000
# PowerShell: $env:VITE_BACKEND_PORT=3101; yarn start:react
```

> ⚠️ Don't start `yarn dev` with `VITE_BACKEND_PORT=3101`. The API reads the same variable
> (`getBackendPort`) and would try to bind :3101 itself.

Verified 2026-10-16: the real UI (on a second Vite on :3005) signed in as `Heath93`, rendered the home
feed and the bank-account list (GraphQL) from the stateful mock, and made no calls to :3001. Add
`--scenario new-user-onboarding` to see the onboarding dialog.

## Use it from Playwright

- **UI tests: prefer route stubs.** Leave the app pointed at the real API and stub only what the test needs
  (`playwright/src/mocks`). The same scenario files load as stubs:
  `await withScenario("new-user-onboarding")(page)` (see `tests/ui/mocked-states.spec.ts`).
- **API-level checks against the mock:** give a request context the mock's base URL and scenario headers:

```ts
const mock = await playwright.request.newContext({
  baseURL: "http://localhost:3101",
  extraHTTPHeaders: { "x-mock-scenario": "empty-notifications", "x-mock-user": "Heath93" },
});
expect(await (await mock.get("/notifications")).json()).toEqual({ results: [] });
```

## Fixtures

| File | Body |
| --- | --- |
| `users.json` | `{ results }`: the first 3 seed users, **without** password hashes |
| `transactions-page.json` | `{ pageData, results }`: page 1 (10 items) of `Heath93`'s personal feed |
| `notifications.json` | `{ results }`: `Heath93`'s unread notifications, newest first |
| `bank-accounts.json` | `{ results }`: `Heath93`'s bank accounts |

Regenerate them with `node tap26/mocks/build-fixtures.mjs`. Never edit them by hand. The transactions,
notifications and bank-accounts fixtures equal the real API's responses for `Heath93` after a reseed.

## Alternative: Prism

[Prism](https://github.com/stoplightio/prism) is a ready-made OpenAPI mock server. It has no
TAP26 scenarios or stateful mode, but it validates requests against the spec:

```bash
npx @stoplight/prism-cli mock tap26/openapi/openapi.yaml -p 3102
curl -s -H "Cookie: connect.sid=x" localhost:3102/notifications            # Prism enforces cookieAuth: no cookie → 401
curl -s -H "Cookie: connect.sid=x" -H "Prefer: code=422" localhost:3102/users/abc
curl -s -H "Prefer: example=notFound" localhost:3102/users/profile/x
```
