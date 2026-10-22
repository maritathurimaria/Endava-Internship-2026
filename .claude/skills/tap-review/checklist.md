# TAP26 review checklist (used by /tap-review and the code-reviewer agent)

Tick what applies to the diff; skip sections for untouched areas.

## General
- [ ] The change does what the request/story says — and nothing else (no drive-by refactors).
- [ ] Names are clear; no dead code, commented-out code or stray `console.log`.
- [ ] No secrets, tokens or personal data added; no new dependency without a stated reason.

## Backend (`backend/**`)
- [ ] New/changed routes use `ensureAuthenticated` unless intentionally public (`/login`, `POST /users`, `/testData` in dev/test).
- [ ] Input validated with express-validator in `backend/validators.ts` + `validateMiddleware`; rules match the frontend Yup schema.
- [ ] Authorization: users can only read/modify their own resources (`req.user.id` compared, not trusted from body/params).
- [ ] lowdb access goes through `backend/database.ts` helpers; soft-delete (`isDeleted`) respected.
- [ ] Money is integer cents; balances updated consistently for payments and requests.
- [ ] GraphQL schema/resolvers updated if the REST model changed (`backend/graphql/`).
- [ ] `tap26/openapi/openapi.yaml` updated; `node tap26/scripts/spec-drift.mjs` would be clean.
- [ ] Seed generator / `data/` changes were explicitly approved.

## Frontend (`src/**`)
- [ ] Every interactive element keeps (or gains) a stable `data-test` id; renamed/removed ids are listed for test-impact.
- [ ] Forms: Formik + Yup; error messages user-friendly; validation mirrors the backend.
- [ ] XState: new events/states handled in the machine, not with ad-hoc component state.
- [ ] MUI components used consistently; responsive at 375×667 when layout changed.
- [ ] Accessible names for inputs/buttons (labels, `aria-*`), focus order sensible.

## Playwright tests (`playwright/**`)
- [ ] Functional style: plain functions taking `page`/`http` first — no classes, no page objects.
- [ ] Imports via aliases (`@api`, `@ui`, `@fixtures/*`, `@utils/*`, `@config`, `@models`).
- [ ] Selectors via `bySel`/`bySelLike` (data-test) or accessible roles — no CSS/XPath chains, no nth-child.
- [ ] No `waitForTimeout`; waits on `waitForApi`/web-first assertions (`expect(...).toBeVisible()`).
- [ ] Each test independent; relies on the `seed` auto-fixture, not on another test's data.
- [ ] Assertions are specific (status AND body fields); no weakened assertion without a documented reason.
- [ ] Known defects (D-005): the test asserts the CORRECT behaviour and is marked `test.fail(true, 'KI-xx: …')`
      or `test.fail(true, 'BUG-###: …')` — never asserts the buggy behaviour as if it were correct.
- [ ] E2E journeys (D-006) live in `playwright/tests/e2e/*.e2e.spec.ts`, tagged `@e2e`, one `test.step` per step.
- [ ] API calls checked via `res.status`/`res.body`; setup uses `bodyOrThrow`.
- [ ] Typecheck clean (`npm --prefix playwright run typecheck`); test passes twice in a row.

## Framework (`.claude/**`, `tap26/**`)
- [ ] Agents/skills keep the BLUEPRINT section structure and frontmatter (name = folder/file name).
- [ ] Guardrails in `.claude/settings.json` / `.claude/hooks/*` not weakened without an approved EP.
- [ ] Scripts are Node `.mjs`, zero-dependency, cross-platform (Windows Git Bash).
- [ ] Docs/CHANGELOG updated for user-visible framework changes.

## Severity guide
- **blocker** — wrong behaviour, data/money corruption, security hole, breaks build/tests.
- **major** — missing tests/spec/docs for the change, authz gap, flaky pattern, contract break.
- **minor** — readability, small duplication, weak assertion with low risk.
- **nit** — style/naming preference; never blocks.
