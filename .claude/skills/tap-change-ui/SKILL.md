---
name: tap-change-ui
description: "Implement a change to the Real World App UI end-to-end: optional UX spec from the ux-designer, React/MUI/XState change by fe-dev preserving the data-test selector contract, test impact analysis, Playwright UI tests on desktop (and mobile when layout changes), docs and code review. Use when a student asks to change a screen, form, label, validation message, navigation or layout, e.g. 'add a confirm dialog before deleting a bank account' or 'show the user's balance in the top bar'."
argument-hint: "<UI change to make, e.g. 'rename the Sign In button to Log in'>"
allowed-tools: Bash(git status *), Bash(head *)
---

# /tap-change-ui — UI change with selectors, tests, docs and review

## Goal
Deliver the requested UI change while keeping the `data-test` contract between UI and tests intact,
with green desktop (and, if layout changed, mobile) UI tests, updated docs and an independent review.

## Inputs
- `$ARGUMENTS` — the whole text is the change request: which screen/component and the desired behaviour.
- Empty → ask: "Which screen, and what should the user see or be able to do differently?"
- **Spec clarity check:** if the request lacks the exact copy, states (empty/loading/error), placement or
  mobile behaviour, run step 1; otherwise skip it and state your interpretation.

State at invocation (read-only): !`git status --short 2>/dev/null | head -20 || true`

## Steps
Track steps with a todo list; each agent ends with the standard hand-off report.

1. **UX spec (optional)** — delegate to `ux-designer` with: "Write a short design-change spec for:
   $ARGUMENTS. Include user goal, copy, states, desktop + mobile (375×667) layout as a Mermaid/ASCII
   wireframe, accessibility notes, and the `data-test` ids to add/keep. Save to `tap26/reports/ux/ux-<YYYYMMDD-HHmm>-<slug>.md`."
   Show the spec to the student and get a yes before step 2.
2. **Implement** — delegate to `fe-dev` with: "Implement $ARGUMENTS (spec: <path or 'none'>) in `src/`
   (components in `src/components/`, containers in `src/containers/`, XState machines in `src/machines/`,
   Formik/Yup forms). Preserve every existing `data-test`; add `data-test` for new interactive elements
   (kebab-case, follow `tap26/knowledge/generated/ui-selectors.md`). If an id must change, list old → new.
   Verify: `yarn types`, `yarn test:unit:ci` if `src/__tests__` covers the area, and that
   http://localhost:3000 renders (Vite hot-reloads). Log intent with
   `node tap26/scripts/memory.mjs log-change <file> \"<summary>\" --by fe-dev`."
3. **Impact** — delegate to `test-impact-analyst`: "Run `node tap26/scripts/impact.mjs`; report
   selectors added/removed/renamed, UI specs in `playwright/tests/ui/` and helpers in `playwright/src/ui/`
   that reference them, whether layout changed (→ mobile run required), and an update plan."
4. **UI tests** — delegate to `ui-automation` with the plan: "Update/add tests in `playwright/tests/ui/`
   using `bySel`, `loginByXstate`, `goToSideNav` etc. from `@ui` and fixtures from `@fixtures/ui`; no
   page objects. Run `cd playwright && npx playwright test <specs> --project=ui-desktop --repeat-each=2`,
   and also `--project=ui-mobile --repeat-each=2` if layout changed. Then `npm run typecheck`."
5. **Docs** — delegate to `doc-writer`: update user-facing docs/screenshots notes in `tap26/docs/`
   where the screen is described, add a release-notes entry, run `node tap26/scripts/scan-app.mjs`
   so `tap26/knowledge/generated/ui-selectors.md` reflects the new ids.
6. **Review** — delegate to `code-reviewer`: "Review `git diff -- src playwright tap26/docs` for the
   `data-test` contract, accessibility basics (labels, roles, focus), FP test style and minimal scope.
   Verdict + findings." Loop findings back to `fe-dev`/`ui-automation` once.

Optional extra: if the change affects forms or dialogs, ask `a11y-auditor` for a quick axe check.

## Quality gates
- Gate 1: app starts (UI http://localhost:3000 → 200) and `yarn types` passes.
- Gate 3: `data-test` contract preserved, or every renamed/removed id is updated in `playwright/src/ui/**` and
  `playwright/tests/ui/**` (grep for the old id returns nothing); `ui-desktop` green; `ui-mobile` green if layout touched.
- Gate 4: new/changed tests pass 2× in a row, typecheck clean, functional style.
- Gate 5: docs updated for the user-visible change; ledger entry in `tap26/memory/changes.md`.
- Gate 6: `code-reviewer` verdict approve (or findings resolved).
Legacy `cypress/` tests are not edited; if they reference a renamed id, list them as a follow-up only.

## Output
```
Change      <one line>
UX spec     <path | skipped>
Frontend    <files>      yarn types ✓
Selectors   +<added>  -<removed>  ~<renamed old→new>
Tests       ui-desktop n/n ×2 ✓   ui-mobile n/n ×2 ✓ | n/a
Docs        <files>
Review      approve | n findings resolved
```
Then "How this was done" and a suggestion (lab-08).

## Memory
- `node tap26/scripts/memory.mjs log-change <file> "<intent>" --by fe-dev` for each `src/` file.
- Renamed selectors → `memory.mjs add-fact ui "data-test <old> renamed to <new> (<date>)" --by fe-dev`.
- UX decisions → `memory.mjs add-decision "<title>" --context "<t>" --decision "<t>" --by ux-designer`.
- `node tap26/scripts/memory.mjs set-active "tap-change-ui: <request> — done"`; `node tap26/scripts/memory.mjs digest`.

## Learn more
- `tap26/docs/06-workflows.md`, `tap26/docs/07-testing-framework.md`, `tap26/docs/02-architecture.md`
- `playwright/README.md` (selectors, fixtures, mobile project)
- Labs: `tap26/labs/lab-08` (UI change), `lab-06` (first UI test), `lab-09` (sync tests)
