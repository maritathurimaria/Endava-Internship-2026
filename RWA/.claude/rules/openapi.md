---
paths:
  - tap26/openapi/**
---

# OpenAPI contract rules

Applies when reading or editing the API contract in `tap26/openapi/`.
Owning agent: `contract-guardian`. The YAML is the source of truth; the JSON is generated.

## Do
- Treat `tap26/openapi/openapi.yaml` as the **single source of truth**. Edit the YAML, then regenerate
  `openapi.json` from it (`npx --yes js-yaml tap26/openapi/openapi.yaml > tap26/openapi/openapi.json`,
  per the recorded convention) — never hand-edit the JSON.
- Document the API's **actual** behaviour, including known defects. The spec currently covers 25 paths /
  35 operations verified against the live API. When behaviour is a known issue, reference the `KI-##` from
  `tap26/knowledge/known-issues.md` (e.g. no 404s → 500/200, `password` hash present in responses,
  create returns 200 for most resources but 201 for users) rather than an idealised contract.
- Keep auth documented as the session cookie `connect.sid` (from `POST /login`), `credentials: true`,
  CORS origin `http://localhost:3000`.
- After any edit, run drift detection until clean: `node tap26/scripts/spec-drift.mjs` (compares spec
  paths/methods against the scanned Express routes).
- Change the spec in the SAME unit of work as the backend change it documents; keep examples real
  (seed users, cents amounts, shortids).
- Serve/verify via Swagger UI: `node tap26/scripts/swagger-server.mjs` → http://localhost:3100
  (proxies `/api/*` → :3001 so cookies work).

## Don't
- Don't document behaviour that doesn't exist, or "fix" the spec to be correct while the code still
  misbehaves — that creates drift and misleads testers. Fix code and spec together, or record the KI.
- Don't edit `openapi.json` directly; don't let YAML and JSON diverge.
- Don't remove the documentation of a known issue without the corresponding code fix and test update.
- Don't add servers/hosts other than the local API.

## Verify before hand-off
- `spec-drift.mjs` reports no missing/extra paths or methods.
- `openapi.json` regenerated from the YAML and both parse.
- API tests that encode the contract still green (`npm --prefix playwright run test:api`).
- Change recorded in `tap26/memory/changes.md` / decisions as appropriate.
