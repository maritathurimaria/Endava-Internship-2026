---
paths:
  - src/**
---

# Frontend rules (React 18 + Vite + MUI 5 + XState 4)

Applies when reading or editing the React UI in `src/`.
Owning agent: `fe-dev` (design spec first from `ux-designer`; a11y from `a11y-auditor`).

## Do
- **Preserve `data-test` attributes** — they are the UI↔test contract. Keep the existing naming
  (`signin-submit`, `transaction-item-${id}`, `bankaccount-*-input`). Add new ones for new interactive
  elements; MUI text fields take it via `inputProps={{ "data-test": "…" }}`, wrappers take it directly.
- Keep business logic in the XState machines (`src/machines/*`), not in components. This repo uses
  **XState v4** (`Machine(...)`, `useMachine`/`useService`, `@xstate/react` 3) — not v5 APIs.
- Keep forms on Formik + Yup (validate on blur); wire MUI `TextField` `label` + helper text so fields
  stay labelled and accessible. Preserve `aria-label` on icon buttons.
- Use the existing containers/components structure (`src/containers/*` fetch/state, `src/components/*` view).
- Keep routes as they are (react-router 5.3 `Switch`/`Route`, `PrivateRoute`): `/signin`, `/signup`,
  `/` + `/public|/contacts|/personal`, `/user/settings`, `/notifications`, `/bankaccounts*`,
  `/transaction/new`, `/transaction/:transactionId`.
- Keep money in cents in state/props; format for display only.

## Don't
- Don't rename or remove a `data-test` selector without running `/tap-sync-tests` and updating the
  Playwright specs — a silent change breaks the suite (gate §7.3).
- Don't introduce v5 XState syntax, class components, or a new state/styling library.
- Don't fetch outside the existing API layer/containers or hardcode `http://localhost:3001` in components.
- Don't touch the `index.auth0/okta/cognito/google.tsx` entry points or auth-provider wiring for a normal change.
- Don't add an app dependency to root `package.json` without the student's OK.
- Don't break the `window.Cypress` service exposure the tests rely on (`exposeAppServices`).

## Verify before hand-off
- `yarn types` passes; the app renders (Vite HMR on :3000; `node tap26/scripts/doctor.mjs --quick`).
- `data-test` contract kept, or tests updated: `npm --prefix playwright run test:ui` green, and
  `test:ui:mobile` when layout/responsive changed (the app's mobile layout starts below 600px — MUI xs; tests treat < 414px as mobile, so also check ~500px by hand).
- User-visible change ⇒ docs updated (`doc-writer`) and change noted in `tap26/memory/changes.md`.
