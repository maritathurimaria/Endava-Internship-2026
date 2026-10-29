---
name: tap-data
description: "Test-data operations on the Real World App's lowdb database: inspect an entity, run referential-integrity checks, reset to the seed (POST /testData/seed, wipes manual data), generate N realistic records as fixtures or via the API, or derive boundary/equivalence values for a field from the Yup and express-validator rules. Use when the student asks 'what's in the transactions table', 'is the seed data consistent', 'reset the database', 'make me 20 bank accounts', or 'boundary values for routingNumber'."
argument-hint: "inspect <entity> | integrity | reset | generate <entity> <n> [apply] | boundaries <field>"
---

# /tap-data — test data operations

## Goal
Let the student see, trust, reset and create test data for the RWA safely, and learn how test data
design (partitions, boundaries, referential integrity) drives good tests.

## Inputs
- `$ARGUMENTS` — sub-command (`$0`) plus its arguments:
  - `inspect <entity>` — entity ∈ `users contacts bankaccounts transactions likes comments notifications banktransfers`.
  - `integrity` — cross-entity consistency report.
  - `reset` — reseed the database (destructive for manual data; asks first).
  - `generate <entity> <n> [apply]` — default writes a fixture file only; `apply` creates records via the API.
  - `boundaries <field>` — e.g. `routingNumber`, `accountNumber`, `bankName`, `amount`, `username`, `password`, `phoneNumber`.
- Empty or unknown sub-command → show this list with one example each, then STOP.
- Data source: `GET http://localhost:3001/testData/<entity>` → `{ results: [...] }` (no login needed; the
  route only exists when `NODE_ENV` is `development` or `test`, see `backend/app.ts`). DB file: `data/database.json`;
  seed: `data/database-seed.json` (5 users, password `s3cret`).

## Steps
1. **Health check** (main thread): the API must answer. If `GET http://localhost:3001/testData/users` fails,
   tell the student to run `/tap-run` and STOP.
2. **Delegate to `data-tester`** (Agent tool) with the sub-command brief below and the shared rules:
   never edit `data/*.json` by hand, never print password hashes (mask as `***` — `/testData/users`
   returns them, see KI-07 in `tap26/knowledge/known-issues.md`), keep throwaway
   scripts in `tap26/reports/data/` (Node, zero dependencies, global `fetch`).
   - **inspect**: fetch the entity; report count, fields with type, null/empty counts, value ranges
     (amount, balance in cents, dates), distinct enums (`privacyLevel`, `status`, `requestStatus`,
     `isDeleted`), 3 example rows, and which seeded user owns how many. Mention related entities.
   - **integrity**: fetch all 8 entities; check `transactions.senderId/receiverId → users.id`,
     `contacts.userId/contactUserId → users.id`, `bankaccounts.userId → users.id`,
     `likes|comments.transactionId → transactions.id`, `notifications.likeId|transactionId`,
     `banktransfers.transactionId|userId`; duplicate `id`/`uuid`; `requestStatus` only on requests;
     `modifiedAt ≥ createdAt`; negative balances. Save `tap26/reports/data/data-<YYYYMMDD-HHmm>-integrity.md`
     with a PASS/FAIL table and up to 5 offending ids per rule.
   - **reset**: the main thread FIRST warns: "This replaces data/database.json with the seed — every
     user, payment or bank account you created by hand is lost." Proceed only after the student says
     yes in chat (or the argument was `reset yes`). Then run
     `node -e "fetch('http://localhost:3001/testData/seed',{method:'POST'}).then(r=>console.log('seed',r.status))"`
     and confirm the user count is back to the seed count. Logged-in browser sessions may need a fresh login.
   - **generate**: build `<n>` valid records with `@faker-js/faker` from `playwright/` (already a dev
     dependency) or plain Node, honouring the frontend Yup rules and backend validators; link to existing
     seeded user ids. Default: write `tap26/mocks/fixtures/generated/<entity>-<n>.json` only (no DB change).
     With `apply`: create them through the API as a seeded user (`POST /login`, then `POST /bankAccounts`,
     `POST /transactions`, `POST /users`, `POST /comments/:transactionId`, …) so validation runs; report
     created ids and remind the student that `/tap-data reset` undoes it.
   - **boundaries**: locate the field's rules in `src/components/*Form.tsx` (Yup) and `backend/validators.ts`
     (express-validator); output an EP/BVA table (partition, value, expected FE result, expected BE result).
     Highlight mismatches — e.g. the bank-account form requires a 9-char routing number but the API only
     checks `isString()`. Probe the API for the BE column only if the student asked (`probe`), then reseed.
3. **Review** the hand-off against the quality gates, then summarise.

## Quality gates
- `reset` never runs without an explicit yes; `apply` never runs without being asked.
- Reports cite the source of each rule (`file:line`) and show counts, not raw dumps.
- No secrets/password hashes in output; generated data is obviously fake.
- After any mutation (`reset`, `apply`, `probe`), the final state is stated (counts per entity).

## Output
- inspect/boundaries: chat tables (≤ 40 lines). integrity: `tap26/reports/data/data-<YYYYMMDD-HHmm>-integrity.md`.
- generate: fixture path or created ids. reset: before/after counts.
- `data-tester` hand-off report.

## Memory
- Integrity failure or FE/BE rule mismatch: `node tap26/scripts/memory.mjs add-learning "<title>" --lesson "<text>" --tags data,validation --applies data-tester,api-automation --by data-tester`.
- Stable data fact: `node tap26/scripts/memory.mjs add-fact data "seed has 5 users, 600 transactions, 5 bank accounts" --by data-tester`.
- Mutations: `node tap26/scripts/memory.mjs journal "tap-data <sub-command>: <result>" --by data-tester`.

## Learn more
- `tap26/docs/07-testing-framework.md` (seed fixture, `db.filter/find`), `tap26/docs/09-mocks-and-stubs.md`
- `playwright/src/api/testData.ts` (`seedDatabase`, `dbFor`)
- Labs: `tap26/labs/lab-03-*` (explore), `tap26/labs/lab-05-*` (first API test), `tap26/labs/lab-11-*` (mocks)
