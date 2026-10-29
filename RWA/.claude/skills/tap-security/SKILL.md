---
name: tap-security
description: "Safe, local-only security assessment of the Real World App through an OWASP Top 10 lens: authentication and session cookie, authorization/IDOR on transactions, bank accounts, users, notifications and comments, mass assignment, input validation, security headers and CORS, GraphQL exposure, hard-coded secrets and dependency audit. Only targets localhost:3000/3001, no DoS or brute force. Use when the student asks 'is this API secure?', 'can user A see user B's bank accounts?', or 'run a security check on my change'."
argument-hint: "[area: auth|idor|validation|headers|graphql|deps|all | <endpoint or feature>]   (default: all)"
---

# /tap-security — safe security assessment (local only)

## Goal
Find real, demonstrable security weaknesses in the locally running RWA, explain their impact in plain
language, and propose fixes — while staying strictly inside safe, legal, local-only boundaries.

## Inputs
- `$ARGUMENTS` — area or target:
  - `auth` — login, logout, `/checkAuth`, session cookie `connect.sid` flags, session secret, user enumeration.
  - `idor` — cross-user access: `GET /transactions/:transactionId`, `PATCH /transactions/:transactionId`,
    `GET/DELETE /bankAccounts/:bankAccountId`, `PATCH /users/:userId`, `PATCH /notifications/:notificationId`,
    `POST /comments/:transactionId`, `POST /likes/:transactionId`, `GET /contacts/:username`,
    `DELETE /contacts/:contactId`, `GET /users/profile/:username` (check which lack `ensureAuthenticated`).
  - `validation` — mass assignment (`balance`, `id` in `PATCH /users/:userId`), negative/huge `amount`,
    type confusion, unexpected fields, XSS payloads stored in `description`/`content` (rendered harmlessly?).
  - `headers` — security headers, CORS (`backend/app.ts`), cookie flags, error verbosity/stack traces.
  - `graphql` — `/graphql` introspection, auth on resolvers in `backend/graphql/`.
  - `deps` — `yarn audit --groups dependencies` (root) and `npm --prefix playwright audit` (read-only).
  - `all` (default) or an endpoint/feature, e.g. `POST /transactions`.
- Template: `tap26/templates/security-report.md`. Output: `tap26/reports/security/`.

## Rules of engagement (non-negotiable — include them verbatim in the brief)
1. Targets: ONLY `http://localhost:3000` and `http://localhost:3001`. Never any other host, never the
   internet, never third-party auth providers (Auth0/Okta/Cognito/Google configs are out of scope).
2. No denial of service, no load, no fuzzing loops > 50 requests, at most 5 login attempts per user.
3. Use seeded test accounts only (password `s3cret`); never read or print `.env*` secrets or real credentials.
4. Do not modify application code; prove with requests, then reseed (`POST /testData/seed`) after any
   state-changing probe and say so.
5. Report findings; do not exploit beyond the minimum proof (one request/response pair).

## Steps
1. **Preconditions** (main thread): API up (`node tap26/scripts/doctor.mjs --quick`); warn that probes
   may change data and the database will be reseeded at the end.
2. **Delegate to `security-tester`** (Agent tool) with the rules above and this brief:
   > Assess <area> of the RWA. Read `tap26/memory/MEMORY.md`, the catalogue
   > `tap26/knowledge/known-issues.md` (KI-04…KI-09 are authz findings; KI-29 — privacy levels not enforced in feeds — is 🔴) and previous reports in
   > `tap26/reports/security/`. Re-verify known issues rather than re-discovering them; cite their KI ids. Map attack surface first from `backend/app.ts`, `backend/*-routes.ts`,
   > `backend/helpers.ts` (`ensureAuthenticated`), `backend/validators.ts`, `backend/auth.ts`,
   > `tap26/openapi/openapi.yaml`. Then test with a zero-dependency Node script in
   > `tap26/reports/security/scratch/` using two seeded users (A owns the resource, B attacks): log in
   > both with `POST /login`, keep separate `connect.sid` cookies, and try each cross-user operation.
   > Static checks: hard-coded secrets (e.g. the express-session secret in `backend/app.ts`), missing
   > helmet-style headers, cookie `httpOnly`/`secure`/`sameSite`, verbose errors. For each finding:
   > OWASP Top 10 (2021) category, CWE if obvious, severity (CVSS-like: critical/high/medium/low/info)
   > with justification for a local demo app, minimal reproduction (curl or Node fetch), evidence
   > (status + trimmed body), root cause `file:line`, fix recommendation, and a regression-test idea for
   > `playwright/tests/api` (per D-005: assert the CORRECT behaviour, mark `test.fail(true, 'KI-xx: …')`). Write `tap26/reports/security/security-<YYYYMMDD-HHmm>-<scope>.md` from the
   > template. Reseed at the end. End with the hand-off report.
3. **Review** findings: every "vulnerable" claim must have a request/response proof; drop or downgrade
   speculative ones to "needs investigation".
4. **Next steps**: offer `/tap-bug` per high finding, `/tap-new-test api` for an authz regression test,
   `/tap-change-api` for fixes.

## Quality gates
- Rules of engagement followed (state it explicitly in the report: hosts, request count, reseeded yes/no).
- Every finding is reproducible with the given request and cites the code location.
- Severity is justified in context (demo app with seed data) — no fear-mongering, no hand-waving.
- Positive results recorded too ("IDOR on GET /bankAccounts/:id: not vulnerable — 403/404 for user B").
- No application code modified; scratch scripts contain no secrets.

## Output
- `tap26/reports/security/security-<YYYYMMDD-HHmm>-<scope>.md`.
- Chat (≤ 15 lines): findings by severity, top 3 with one-line impact, what was verified safe, next step.

## Memory
- Confirmed weakness pattern: `node tap26/scripts/memory.mjs add-learning "<title>" --lesson "<text>" --tags security,<owasp> --applies security-tester,be-dev,code-reviewer --by security-tester`.
- Verified security fact: `node tap26/scripts/memory.mjs add-fact security "<fact>" --by security-tester`.
- Risk acceptance by the student: `node tap26/scripts/memory.mjs add-decision "<risk accepted>" --context "<why>" --decision "<what>" --by security-tester`.

## Learn more
- `tap26/docs/10-hooks-and-guardrails.md`, `tap26/docs/08-api-contract-and-swagger.md`
- Labs: `tap26/labs/lab-05-*` (first API test — reuse it for authz tests), `tap26/labs/lab-07-*` (API change)
- OWASP Top 10: https://owasp.org/Top10/ · OWASP API Security Top 10: https://owasp.org/API-Security/
