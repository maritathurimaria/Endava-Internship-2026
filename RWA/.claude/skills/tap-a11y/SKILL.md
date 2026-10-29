---
name: tap-a11y
description: "Accessibility audit of Real World App screens against WCAG 2.2 AA: automated axe-core scans through Playwright plus manual checks axe cannot do (keyboard-only flow, focus order and visibility, labels and accessible names, contrast, zoom/reflow at 375px, screen-reader text), with severity-ranked findings and optional a11y regression tests. Use when the student asks 'is the sign-in page accessible?', 'audit the new transaction flow for a11y', or after a UI change."
argument-hint: "[screen|route|all] [tests]   e.g. signin, /transaction/new, bankaccounts, all"
---

# /tap-a11y — accessibility audit

## Goal
Show the student which accessibility barriers exist on the RWA screens, who they hurt, and how to fix
them — with evidence from automated scans AND human checks, and optionally tests that keep them fixed.

## Inputs
- `$ARGUMENTS` — screen(s) to audit plus optional `tests`:
  - route or name: `signin` (`/signin`), `signup` (`/signup`), `home` (`/`, public/contacts/personal feeds),
    `new` (`/transaction/new`, 3 steps), `detail` (`/transaction/:id`), `bankaccounts` (`/bankaccounts`,
    `/bankaccounts/new`), `notifications` (`/notifications`), `settings` (`/user/settings`), `onboarding`
    (first-login dialog for a user without a bank account);
  - `all` — every screen above;
  - `tests` — also add/extend `playwright/tests/ui/a11y.spec.ts`.
- Empty → `signin signup home new` (the core journey).
- Standard: WCAG 2.2 level AA. Template: `tap26/templates/a11y-report.md`. Output: `tap26/reports/a11y/`.

## Steps
1. **Preconditions** (main thread): app up (`node tap26/scripts/doctor.mjs --quick`; if 3000/3001 are
   down suggest `/tap-run` and STOP). Check `playwright/package.json` for `@axe-core/playwright`.
   If missing, ask the student: "Add `@axe-core/playwright` as a dev dependency of `playwright/` (not the
   app)? yes/no". On no → manual-only audit, say so in the report.
2. **Delegate to `a11y-auditor`** (Agent tool) with this brief:
   > Audit <screens> of the RWA at WCAG 2.2 AA. Read `tap26/memory/MEMORY.md` and the latest report in
   > `tap26/reports/a11y/` (do not re-report known, unchanged issues — reference them).
   > (a) Automated: a throwaway Playwright script or spec using `@axe-core/playwright` with tags
   > `wcag2a, wcag2aa, wcag21aa, wcag22aa`, logged in via `loginByXstate` (`@ui`) as a seeded user
   > (password `s3cret`), at 1280×1000 and 375×667. Record violations by rule id, impact, count, a
   > `data-test`/selector example.
   > (b) Manual: keyboard-only walk through each screen (Tab/Shift+Tab/Enter/Space/Esc), visible focus,
   > focus trap/return in MUI dialogs and drawers, accessible names of icon buttons (nav drawer, like,
   > notifications badge), form error announcement (Formik `helperText`), the amount slider and date-range
   > picker in the feed filters, page titles, headings order, contrast of muted text, 200% zoom / reflow.
   > (c) Triage: confirm axe findings manually (MUI portals cause false positives); map each to a WCAG
   > success criterion; severity critical/serious/moderate/minor; who is affected; fix pointing at the
   > component (`src/components/*.tsx`) and the `fe-dev` change needed.
   > Write `tap26/reports/a11y/a11y-<YYYYMMDD-HHmm>-<scope>.md` from `tap26/templates/a11y-report.md`.
   > If `tests` was requested: add/extend `playwright/tests/ui/a11y.spec.ts` (functional style, one test per
   > screen, assert no critical/serious violations, known issues listed in an explicit allow-list with a
   > comment linking the report). Run it twice + typecheck. Do NOT modify `src/`. End with the hand-off.
3. **Review** against the gates; ask for missing manual checks if the report is axe-only.
4. **Next steps**: offer `/tap-change-ui` for the top fixes (it routes through `ux-designer` and `fe-dev`).

## Quality gates
- Both automated and manual sections are present (or the report explains why one is missing).
- Every finding: WCAG SC id + name, severity, screen, element (`data-test` or role/name), evidence, fix.
- Counts are reported per screen and per viewport; known issues are not double-counted.
- No app code changed; new tests (if any) pass twice and typecheck clean; tests reseed — warn the student.

## Output
- `tap26/reports/a11y/a11y-<YYYYMMDD-HHmm>-<scope>.md`; optional `playwright/tests/ui/a11y.spec.ts`.
- Chat (≤ 15 lines): counts by severity, top 3 barriers ("who can't do what"), quick wins, next step.

## Memory
- Baseline: `node tap26/scripts/memory.mjs add-fact a11y "axe baseline <screen>: <n> serious, <n> moderate (<date>)" --by a11y-auditor`.
- Pattern (e.g. icon buttons without names): `node tap26/scripts/memory.mjs add-learning "<title>" --lesson "<text>" --tags a11y --applies a11y-auditor,fe-dev,ux-designer --by a11y-auditor`.
- New dependency approved: `node tap26/scripts/memory.mjs add-decision "Add @axe-core/playwright" --context "<why>" --decision "dev dependency of playwright/" --by a11y-auditor`.

## Learn more
- `tap26/docs/07-testing-framework.md`, `tap26/docs/03-agents.md` (a11y-auditor)
- Labs: `tap26/labs/lab-06-*` (first UI test — the same fixtures power the axe spec), `tap26/labs/lab-08-*` (UI change)
- WCAG 2.2 quick reference: https://www.w3.org/WAI/WCAG22/quickref/
