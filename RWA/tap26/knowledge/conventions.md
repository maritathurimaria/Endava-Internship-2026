> **Purpose:** Coding, testing, git and documentation conventions for the RWA app and the TAP26 Playwright framework: what the code already does, and what TAP26 agents and students must follow.
> **Last verified:** 2026-10-16 (`.prettierrc`, `eslint.config.mjs`, `tsconfig*.json`, `package.json`, `playwright/README.md`, `playwright/playwright.config.ts`, `tap26/memory/decisions.md` D-001…D-007)

# Conventions

Path-scoped rules with the same intent are loaded automatically by Claude Code from `.claude/rules/`
(`backend.md`, `frontend.md`, `playwright.md`, `openapi.md`, `tap26-memory.md`). This page is the
human-readable summary.

## 1. App code (`backend/`, `src/`)

| Topic | Convention | Source |
|---|---|---|
| Language | TypeScript, `strict: true`, target ES2020, `jsx: react-jsx`, `baseUrl: src` | `tsconfig.json` |
| Backend TS | run by ts-node with `tsconfig.tsnode.json` (`module: commonjs`, `types: ["node"]`) | `tsconfig.tsnode.json` |
| Formatting | Prettier 3: `printWidth: 100`, `trailingComma: "es5"`, `endOfLine: "auto"`, default double quotes and semicolons. `data/`, `build/`, `coverage/` ignored | `.prettierrc`, `.prettierignore` |
| Lint | ESLint 10 flat config: `@eslint/js` recommended + `typescript-eslint` recommended + `eslint-plugin-cypress`, **only for `**/*.ts`** (`.tsx` is not linted by `yarn lint`). Many rules are switched off (`no-explicit-any`, `ban-ts-comment`, `no-unused-vars`, …). Vite also runs `vite-plugin-eslint` in dev | `eslint.config.mjs` |
| Checks | `yarn types` (`tsc --noEmit`), `yarn lint` (eslint + `prettier --check`), `yarn test:unit:ci` (Vitest, `fileParallelism: false`) | `package.json`, `vite.config.ts` |
| Git hooks | `package.json` declares `husky.hooks.pre-push: yarn types`, but husky 7 ignores that field and `.husky/` holds no hook scripts, so **no git hook runs** | `.husky/` |
| Functional style | `lodash/fp` everywhere (`flow`, `curry`, `get`, `isEqual`) in `database.ts`, `transactionUtils.ts`, seed utils | |
| Route shape | `router.<verb>(path, ensureAuthenticated?, validateMiddleware([...validators]), handler)`. Validators live in `backend/validators.ts` | `backend/*-routes.ts` |
| Data access | only through `backend/database.ts` helpers. Money is integer **cents** | `.claude/rules/backend.md` |
| UI structure | `containers/` = route + state wiring, `components/` = view. Business logic in XState machines (v4 API). Forms = Formik + Yup | `.claude/rules/frontend.md` |
| Styling | MUI 5 `styled()` with a `PREFIX` + `classes` object per component (output of the JSS→styled codemod) | e.g. `NavBar.tsx` |
| HTTP | `httpClient` from `src/utils/asyncUtils.ts` (axios, `withCredentials`), URL built from `backendPort` | machines |

### `data-test` naming (the UI ↔ test contract)

| Pattern | Examples | Rule |
|---|---|---|
| `<area>-<element>` kebab-case | `signin-submit`, `sidenav-toggle`, `bankaccount-new`, `user-settings-submit` | static elements |
| `<area>-<field>-input` | `bankaccount-bankName-input`, `transaction-create-amount-input`, `user-settings-firstName-input` | form fields. **The field name keeps its camelCase** |
| `<entity>-<element>-${id}` | `transaction-item-${id}`, `transaction-like-button-${id}`, `notification-mark-read-${id}`, `user-list-item-${id}` | per-record elements. Tests use the prefix (`bySelLike` / `getBySelLike`) |
| `nav-top-*`, `nav-*-tab`, `sidenav-*` | `nav-top-notifications-count`, `nav-contacts-tab`, `sidenav-signout` | navigation |
| `empty-list-*`, `list-skeleton`, `alert-bar-${severity}` | | shared states |

Rules: never rename or remove a `data-test` without `/tap-sync-tests`. Every new interactive element gets one. For MUI
`TextField`, both placements exist (wrapper vs `inputProps`). Follow the sibling fields in the same form. See
[ui-map.md](ui-map.md#selector-placement-cheat-sheet-mui-textfield).

## 2. Tests (Playwright framework in `playwright/`)

Summarised from `playwright/README.md`, the config and decisions D-001, D-002, D-005, D-006.

| Rule | Detail |
|---|---|
| **Functional, no classes or page objects** (D-001) | helpers are plain functions taking their dependency first: `createTransaction(http, payload)`, `pickDateRange(page, start, end)` |
| **Data, not clients** | API helpers return frozen `{ status, ok, body, headers, url }` and never throw on HTTP status. Use `bodyOrThrow` only in setup |
| **Fixtures instead of hooks** | `test.extend` fixtures: `api` (request context), `seed` (**auto**, reseeds before every test), `db` (`filter/find/all`), `page` (with `exposeAppServices`). `@fixtures/api` adds `users` + auto-login `me` (= `users[0]`). `@fixtures/ui` adds `users`. Spec-specific fixtures (`ctx`, `seedIds`) replace Cypress `let ctx` |
| **Imports via aliases** | `@fixtures/ui`, `@fixtures/api`, `@ui`, `@api`, `@utils/*`, `@config`, `@models` (`playwright/tsconfig.json`) |
| **Selectors** | `data-test` only (`testIdAttribute: "data-test"`): `bySel`, `bySelLike`, `textbox` (handles wrapper vs input) |
| **Wait for the API, start before the action** | `const res = waitForApi(page, { method, path }); await click(); await res;` (L-004). Stubbing: `stubApi`, `transformApi`, `recordApi` |
| **No hard waits** | no `waitForTimeout`. Use web-first `expect`, `expect.poll`, `expect(...).toPass()` (L-002) |
| **Seed per test, serial** (D-002) | `workers: 1`, `fullyParallel: false`. Every test reseeds the shared DB |
| **UTC** | `process.env.TZ = "UTC"` and `timezoneId: "UTC"`, `locale: "en-US"` |
| **Projects** | `api` (baseURL :3001), `ui-desktop` (1280×1000), `ui-mobile` (375×667, `isMobile: false`). **D-006:** end-to-end journeys go in `playwright/tests/e2e/*.e2e.spec.ts` in a dedicated `e2e` project (desktop viewport) run with `npx playwright test --project=e2e`, tagged `{ tag: ['@e2e'] }`, one `test.step` per journey step. *(As of this check `playwright.config.ts` has no `e2e` project or `tests/e2e/` folder yet.)* |
| **Known defects** (D-005) | tests assert the **correct** behaviour and are marked `test.fail(true, "KI-xx: <summary>")`, or `"BUG-###: …"` for new defects. The suite stays green and flips to "unexpected pass" when the bug is fixed. Then remove `test.fail` and update the row in [known-issues.md](known-issues.md). OpenAPI still documents the *actual* behaviour |
| **Mobile** | branch with `isMobile(page)` (width < 414). Use `goToSideNav` / `openSideNavOnMobile` / `closeSideNavOnMobile` (idempotent) |
| **Mock server** | `tap26/scripts/mock-server.mjs` (:3101) is for API exploration and demos. The **UI cannot be pointed at it**, because the backend port is baked in at Vite build time and CORS is fixed. UI tests stub with `stubApi` / `transformApi` instead |
| **Visual** | Percy snapshots are not ported. Use `expect(page).toHaveScreenshot()` if needed |
| **Formatting** | Prettier `printWidth: 120` in `playwright/.prettierrc`. Run `npm run typecheck` and `npm run format` |
| **Titles** | keep the Cypress title when porting a test (traceability, see [test-map.md](test-map.md)). New tests: behaviour sentence ("creates a new bank account") |

Cypress (`cypress/`) is the reference suite. Its idioms are `cy.getBySel`, `cy.intercept().as()` + `cy.wait()`, `cy.task("db:seed")` in
`beforeEach`, `cy.database()`, `cy.loginByXstate` and `isMobile()`.

## 3. Git

| Topic | Convention |
|---|---|
| Branches (students) | `lab/NN-name`, e.g. `lab/03-first-api-test`, one branch per lab. Agents never push |
| Commit messages | **Conventional Commits**, as used upstream (`chore: wait for the frontend and API before running Cypress (#1739)`): `type(scope): imperative summary`. Types: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `ci`. Example: `test(api): cover KI-05 reject request moves money` |
| Before committing | review the diff (VS Code Source Control or `/tap-review`). Restore `data/database.json` (git-tracked, changed by every run) unless the change is intentional |
| Destructive actions | ask first: deleting tests, `git push`, `git reset --hard`, `yarn db:seed`, adding dependencies (CLAUDE.md) |

## 4. Documentation

| Topic | Convention |
|---|---|
| Framework | **Diátaxis** (see `tap26/docs/00-index.md`): tutorials = `tap26/labs/`, how-to = workflows/troubleshooting, reference = agents/skills/testing framework/knowledge, explanation = architecture/memory. Don't mix kinds on one page |
| Knowledge files | start with the 2-line header `Purpose:` / `Last verified: YYYY-MM-DD (against …)`. Cite file paths. Prefer tables and Mermaid. Mark unchecked claims *(unverified)*. Never hand-edit `knowledge/generated/` |
| Defects | catalogue in [known-issues.md](known-issues.md) as `KI-xx`. Never delete rows. Mark them ✅ when fixed |
| Reports | `tap26/reports/<type>/` (D-007). Types: impact, bugs, manual, reviews, research, a11y, security, perf, test-plans, ux, ba, debug, data, doctor, e2e. Names: `<type>-<YYYYMMDD-HHmm>-<slug>.md` or `BUG-###-<slug>.md` |
| API contract | `tap26/openapi/openapi.yaml` is the source of truth. `openapi.json` is generated. `node tap26/scripts/spec-drift.mjs` must be clean after API changes |
| Memory | write only via `node tap26/scripts/memory.mjs` (`add-fact`, `add-learning`, `add-decision`, `add-question`, …). Facts use `- [area] fact (verified YYYY-MM-DD by <agent>)` |
| Hand-offs | `tap26/templates/handoff.md` |
| VS Code | tasks are labelled **"TAP: …"** (Terminal → Run Task) |
