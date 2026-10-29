---
name: tap-test-cases
description: "Design manual test cases for a Real World App feature in one of three formats: a classic steps table (ID, preconditions, data, steps, expected), Gherkin scenarios with examples, or a time-boxed exploratory charter with session notes. Applies equivalence partitioning, boundary values, state transitions and decision tables, and flags automation candidates. Use when the student says 'write test cases for sign-up', 'give me Gherkin for creating a payment', or 'an exploratory charter for notifications'."
argument-hint: "<feature or screen> [steps|gherkin|charter]   (default: steps)"
---

# /tap-test-cases — manual test cases & charters

## Goal
Turn a feature or screen into well-designed manual tests the student can execute against the running
app (http://localhost:3000) — and that a later `/tap-new-test` can automate.

## Inputs
- `$ARGUMENTS` — the feature/screen plus an optional format word anywhere in the text:
  - `steps` (default) — classic table, template `tap26/templates/test-case.md`;
  - `gherkin` — Feature / Background / Scenario (Outline) / Examples;
  - `charter` — exploratory charter, template `tap26/templates/exploratory-charter.md`.
- Examples: `bank account creation`, `sign up gherkin`, `transaction feed filters charter`.
- Empty → ask which feature/screen, then STOP.
- Output folder: `tap26/reports/manual/`.

## Steps
1. **Resolve the feature to code** (main thread, quick): find the screen and its pieces, e.g.
   sign-up → `src/components/SignUpForm.tsx` + `src/machines/authMachine.ts` + `POST /users`
   (`backend/user-routes.ts`); new transaction → `TransactionCreateStepOne/Two/Three.tsx` +
   `createTransactionMachine.ts` + `POST /transactions`. Pass these paths to the agent.
2. **Delegate to `manual-tester`** (Agent tool) with this brief:
   > Write <format> test cases for "<feature>". Read the component(s), the Yup schema in the form, the
   > matching validators in `backend/validators.ts` and the XState machine before designing. Use these
   > techniques and name them per case: equivalence partitions, boundary values (e.g. bank name min 5
   > chars, routing number exactly 9, account number 9–12), state transitions (machine states/events),
   > decision tables for combined rules (privacy level × feed). Reference elements by their `data-test`
   > id (e.g. `bankaccount-routingNumber-input`) or visible label. Use seeded users (password `s3cret`)
   > and say when to reset with `POST /testData/seed`. You may explore the running app with a throwaway
   > Playwright script or `npx playwright codegen http://localhost:3000` (run from `playwright/`) to
   > confirm real behaviour — never record personal data. Format rules:
   > - steps: IDs `TC-<AREA>-###`, priority P1–P3, preconditions, test data, numbered steps, ONE
   >   verifiable expected result per step that has one; mark `Automation candidate: yes/no (why)`.
   > - gherkin: declarative Given/When/Then (business language, no clicks/selectors), Scenario Outline
   >   + Examples for partitions/boundaries, a Background for the logged-in user.
   > - charter: "Explore <target> with <resources> to discover <information>", 30/60/90-min timebox,
   >   tour ideas (data, error, interruption, mobile 375×667), notes/bugs/questions sections left for the session.
   > Grep `playwright/tests` and `cypress/tests` for existing coverage and cite it per case.
   > Save to `tap26/reports/manual/` as `manual-<YYYYMMDD-HHmm>-tc-<slug>.md`, `manual-<YYYYMMDD-HHmm>-gherkin-<slug>.md`
   > or `manual-<YYYYMMDD-HHmm>-charter-<slug>.md` (D-007 naming).
   > End with the hand-off report.
3. **Review** against the quality gates; send one follow-up if needed.
4. **Suggest** next steps: execute now (`/tap-bug` for anything that fails), automate the top
   candidates (`/tap-new-test ui <case id>` or `api`), or turn Gherkin into a story (`/tap-ask ba`).

## Quality gates
- Each case is independent and repeatable from a known state (seed + named user).
- Expected results are observable (text, `data-test` element, URL, API status, DB value via
  `GET /testData/<entity>`), never "works correctly".
- At least one negative and one boundary case per input field in scope.
- Frontend (Yup) vs backend (`backend/validators.ts`) rule differences are called out explicitly.
- Existing automated coverage is cited, so duplicates are visible.

## Output
- File(s) in `tap26/reports/manual/` (path printed).
- Chat summary: number of cases/scenarios by priority, techniques used, automation candidates, any
  FE/BE validation mismatch spotted, and the next command.

## Memory
- Validation mismatch or surprising behaviour: `node tap26/scripts/memory.mjs add-learning "<title>" --lesson "<text>" --tags manual,validation --applies manual-tester,ui-automation --by manual-tester`.
- Unclear expected behaviour: `node tap26/scripts/memory.mjs add-question "<question>" --by manual-tester`.

## Learn more
- `tap26/docs/07-testing-framework.md`, `tap26/docs/glossary.md` (EP, BVA, charter)
- Labs: `tap26/labs/lab-03-*` (explore the app), `tap26/labs/lab-06-*` (first UI test — automate a case)
