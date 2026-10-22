> **Purpose:** Index of the TAP26 knowledge base for the Cypress Real World App (RWA), and how agents and students should use it.
> **Last verified:** 2026-10-16 (against commit `c5f5d9f`, app running on :3000/:3001)

# Knowledge base: index

This folder is the **map of the app under test**. Read it before you open source files: it tells you
where things live, how they work and which tests cover them, with file paths so you can jump
straight to the code.

## Two kinds of knowledge

| Folder | Written by | Content | Can I edit it? |
|---|---|---|---|
| `tap26/knowledge/*.md` (this folder) | people and agents (`doc-writer`, `knowledge-curator`) | **Curated** explanations, diagrams, gotchas and traceability. Every claim was checked against code or the running app. | Yes. Keep the header and re-verify what you change. |
| `tap26/knowledge/generated/*.md` | `node tap26/scripts/scan-app.mjs` (skill `/tap-scan`) | **Generated** inventories: routes, selectors, test titles, coverage matrix, machines. Deterministic and overwritten on every run. | **No.** Re-run the scanner instead. |

**Rule of thumb:** use `generated/` for complete lists and up-to-date facts like "does selector X still
exist?" or "which spec calls `PATCH /users/:userId`?". Use the curated files when you need to know
*why* or *how*, the gotchas, or the bugs nobody wrote down. If the two disagree, the generated
file reflects the code as it is now. Fix the curated file, or raise it as an open question with
`node tap26/scripts/memory.mjs`.

## Curated files

| File | Read it when you need… | Key contents |
|---|---|---|
| [app-architecture.md](app-architecture.md) | the big picture | stack and versions, runtime topology, backend middleware order, frontend composition, payment request lifecycle, auth providers, coverage, `window.Cypress` hooks |
| [api-overview.md](api-overview.md) | to call or test the REST/GraphQL API | every endpoint with auth, validation, response shape, side effects and status codes. Companion to [`../openapi/openapi.yaml`](../openapi/openapi.yaml) |
| [ui-map.md](ui-map.md) | to automate or explore a screen | route → container → components, user actions, `data-test` selectors per screen, empty/error states, mobile vs desktop, onboarding |
| [data-model.md](data-model.md) | to reason about data and test data | entities, ER diagram, money in cents, transaction lifecycle, privacy and feeds, notifications, seed facts and users, reset/regenerate |
| [state-machines.md](state-machines.md) | to understand UI behaviour or drive it programmatically | every XState machine: states, events, services, who uses it, what is on `window` |
| [conventions.md](conventions.md) | to write code, tests, commits or docs the TAP26 way | TS/Prettier/ESLint, `data-test` naming, Playwright functional style, commits, branches, Diátaxis |
| [test-map.md](test-map.md) | to know what is tested and what isn't | feature ↔ Cypress specs ↔ Playwright specs ↔ Vitest, known gaps and ideas for students |
| [gotchas.md](gotchas.md) | when something behaves strangely | verified pitfalls (shared DB, CORS, sessions, MUI selectors, virtualised lists, UTC, slider maths, mobile drawer…) and app bugs found while writing this |
| [known-issues.md](known-issues.md) | to file a bug, write a negative test or pick a "fix it" lab | catalogue of verified defects: API **KI-01…KI-33** (data integrity, IDOR, leaked hashes, status codes, validation, pagination) plus accessibility **A11Y-01…A11Y-04** and test-suite issues **TS-01/TS-02**, maintained by `contract-guardian` |

## Generated files (`generated/`)

| File | Content |
|---|---|
| `generated/api-routes.md` | Express routes: method, full path, file:line, middleware, validators |
| `generated/ui-routes.md` | react-router paths → components |
| `generated/ui-selectors.md` | every `data-test` value in `src/**`, grouped by component |
| `generated/tests-inventory.md` | Playwright and Cypress (e2e + component) specs with describe/test titles |
| `generated/coverage-matrix.md` | API route → specs, selector → specs, uncovered summary |
| `generated/state-machines.md` | XState machine ids, states, events, window services |

Refresh with `node tap26/scripts/scan-app.mjs` (or `/tap-scan`) after any change under `backend/`, `src/`,
`cypress/` or `playwright/`.

## How agents should use this knowledge base

1. **Start narrow.** Open the one curated file your task needs (see the table above), not all of them.
2. **Trust, but verify the hot path.** These files cite `file:line`-level locations. Before you change
   code, open the cited file. The code always wins over the docs.
3. **Prefer `generated/` for lists**, such as all selectors or all routes. Curated files show the important ones
   and explain them.
4. **Write back what you learn.** A new verified fact goes into `tap26/memory/facts.md` through
   `node tap26/scripts/memory.mjs`. A change in app behaviour also means updating the curated file here, with a new
   *Last verified* date.
5. **Mark uncertainty.** Anything not checked against code or the running app must carry *(unverified)*.

## Quick facts (all verified 2026-10-16)

| Fact | Value |
|---|---|
| UI / API | http://localhost:3000 (Vite) / http://localhost:3001 (Express) |
| Login | any seeded username, password `s3cret` (e.g. `Heath93`, the first user) |
| Reset data | `curl -X POST http://localhost:3001/testData/seed` (no auth; PowerShell users: use `curl.exe`, or run it in Git Bash) |
| DB file | `data/database.json` (lowdb, **git-tracked**, held in memory by the API) |
| Seed | `data/database-seed.json`: 5 users, 15 contacts, 5 bank accounts, 600 transactions, 10 likes, 10 comments, 40 notifications, 50 bank transfers |
| Money | integers in **cents** in DB/API responses. `POST /transactions` takes **dollars** and multiplies by 100 |
| Session | cookie `connect.sid` (express-session MemoryStore, lost on every API restart) |
| Test hooks | app services on `window` only if `window.Cypress` is truthy (Playwright sets it in `playwright/src/ui/app.ts`) |
