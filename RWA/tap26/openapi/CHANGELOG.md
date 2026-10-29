# OpenAPI changelog

Every change to `tap26/openapi/openapi.yaml` bumps `info.version` and gets an entry here
(owner: `contract-guardian`). Format: `## <version> — <date>` then Added / Changed / Fixed / Documented-defects.

## 1.0.0 — 2026-10-16
- Added: initial OpenAPI 3.0.3 description of the RWA API — 25 paths, 35 operations, 11 tags, full component
  schemas with seed-based examples, `cookieAuth` (`connect.sid`), servers `/api` (Swagger proxy) and `http://localhost:3001`.
- Documented-defects: actual behaviour of KI-01…KI-27 (see `tap26/knowledge/known-issues.md`), e.g. 500s instead of
  404s, plain-text `OK` bodies, password hashes in user objects.
- Verified: 135 live checks across all operations; Redocly lint 0 errors (8 justified warnings).
