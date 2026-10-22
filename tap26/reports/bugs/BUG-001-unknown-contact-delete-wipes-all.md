# BUG-001 - DELETE /contacts removes all contacts for an unknown id

| Field | Value |
|---|---|
| Status | Confirmed in KI-01 catalogue; not re-run in this report |
| Severity | Critical - one authenticated request can delete every contact record, causing broad data loss |
| Priority | P1 - affects all users' contact relationships and has no safe user-level recovery |
| Area | `DELETE /contacts/:contactId` |
| Reported by / date | GitHub Copilot / 2026-10-20 |
| Related | KI-01 in `tap26/knowledge/known-issues.md` |
| Reproduction rate | Previously verified and catalogued; not measured in this report |

## Environment
- Commit: unavailable; current terminal directory is not a Git worktree. Branch: unavailable.
- App: API `http://localhost:3001` · DB reseeded before repro: no; test not run to preserve the current database.
- Browser / viewport: API only · OS: Windows · Node: `v26.12.0`
- User: any authenticated seeded user; not used for this report.

## Preconditions
- Use an isolated, disposable RWA database. This known issue may delete all contacts, so do not run the reproduction against data that must be preserved.
- Authenticate as a seeded user. The DELETE route requires authentication.
- Have at least one contact record, and choose a well-formed short ID that does not match any contact record.

## Steps to reproduce
1. In the isolated environment, record the current contact records and their count.
2. Authenticate with `POST /login` and retain the session cookie.
3. Send `DELETE /contacts/<well-formed-short-id-not-present-in-the-contact-list>` with that cookie.
4. Read the contact records again and compare them with the pre-request list.

## Expected result
No existing contact record is deleted because the supplied ID does not identify one. The OpenAPI description says this operation deletes the contact record with the given contact ID; it does not specify the status code for an unknown ID. A 404 would be a reasonable explicit not-found response, but the contract needs to define that status.

## Actual result
KI-01 records that a well-formed but unknown ID deletes every contact in the database. The route's response contract is HTTP 200 with an empty JSON object `{}`. The destructive side effect was not reproduced in this session because running the Playwright test invokes an automatic database seed, and issuing the DELETE against the current database could destroy contact data.

## Evidence
```http
DELETE /contacts/<well-formed-short-id-not-present-in-the-contact-list>

-> 200
{}
```
- Evidence source: `tap26/openapi/openapi.yaml` documents HTTP 200 `{}` and describes the known destructive behavior; `tap26/knowledge/known-issues.md` catalogs KI-01 as verified. The current `backend/contact-routes.ts` responds with status 200 and JSON from `removeContactById`.
- Live response capture: none in this report; the API was not called.
- The existing Playwright spec `playwright/tests/api/social.api.spec.ts` only deletes an existing contact. It does not contain a test for an unknown ID.
- Screenshot / trace: none.
- `data-test` elements involved: none (API-only).

## Impact
Any authenticated caller who submits a valid-format contact ID that does not exist can remove all contact relationships, affecting every user and features that depend on contacts, including the Friends feed. Re-creating the relationships is a manual workaround; restoring the database from seed would also discard other manual data.

## Root cause (confirmed by debugger)
- Not investigated in this report. No application changes were made.

## Regression test
- Not yet. The current Playwright contacts API spec only tests deletion of an existing contact; no unknown-ID regression test is present.

## Notes
- Reproduction was deliberately skipped to honor the instruction not to reset the database or risk deleting its contacts.
- The Playwright README documents that every test reseeds the app database. The closest existing test is `playwright/tests/api/social.api.spec.ts` -> `DELETE /contacts/:contactId deletes a contact`.
