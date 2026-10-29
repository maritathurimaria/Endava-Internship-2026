---
paths:
  - backend/**
  - data/**
  - scripts/**
---

# Backend & data rules (Express + lowdb + GraphQL)

Applies when reading or editing the Express API (`backend/`), seed/data (`data/`) or app scripts (`scripts/`).
Owning agent: `be-dev` (data checks: `data-tester`; env/scripts: `env-ops`).

## Do
- Keep each route's three-part shape: `ensureAuthenticated` (if protected) → `validateMiddleware([...])`
  → handler. Add validators in `backend/validators.ts`; reuse `shortIdValidation`, the `isXValidator` arrays.
- Return the status codes already in use: 200 (read/most writes), 201 (`POST /users`), 204 (PATCH updates,
  `sendStatus(204)`), 401 (`ensureAuthenticated` failure), 422 (validation errors — the standard shape
  `{ errors: [...] }` from express-validator). Match the sibling routes.
- Access data only through `backend/database.ts` helpers (`getXById`, `createX`, `updateXById`, …);
  keep money amounts in **cents** (integers), as the seed does.
- Scope owner data by `req.user.id`; a read/write of another user's record is a bug unless the route is
  explicitly public (`GET /users/profile/:username`, public feed).
- Update `tap26/openapi/openapi.yaml` in the SAME change as any route/param/response change, then run
  `node tap26/scripts/spec-drift.mjs` until clean (hand to `contract-guardian`).
- Keep REST and GraphQL (`backend/graphql/`) consistent when they cover the same entity (bank accounts).
- Scripts stay zero-dependency Node ESM (`.mjs`) and cross-platform (they run under Git Bash on Windows).
- After a mutating manual check, reseed: `curl -s -X POST http://localhost:3001/testData/seed`.

## Don't
- Don't put a `data-test`-affecting or response-shape change in without updating OpenAPI and API tests.
- Don't leak secrets: never return `password`/hash in a user payload; never read or print `.env*`.
- Don't hand-edit `data/database.json` for a test — reseed from `data/database-seed.json` instead.
- Don't run `yarn db:seed` (regenerates the seed via faker) without the student's explicit OK — it changes
  everyone's fixture data. `yarn db:seed:dev` (copy seed → db) is the safe reset.
- Don't add a dependency to the app's root `package.json` without approval.
- Don't "fix" a known defect silently: the real behaviour is catalogued in `tap26/knowledge/known-issues.md`
  and documented by tests — change it deliberately and move spec + tests + docs together.
- Don't stop the running app (it auto-reloads `backend/` via nodemon); don't change ports (3000/3001).

## Verify before hand-off
- `yarn types` passes for touched TypeScript.
- App still responds: `node tap26/scripts/doctor.mjs --quick`.
- API change ⇒ `spec-drift.mjs` clean and `npm --prefix playwright run test:api` green (reseeds the DB).
- Record the change intent in `tap26/memory/changes.md` (the PostToolUse hook logs the file edit).
