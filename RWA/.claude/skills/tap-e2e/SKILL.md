---
name: tap-e2e
description: "Extend the Playwright suite with a cross-layer end-to-end journey (UI + API + data) designed and implemented by the e2e-architect as playwright/tests/e2e/*.e2e.spec.ts running in the existing e2e Playwright project (D-006), with tagging and documentation. Use when a student wants a realistic user journey tested from start to finish, e.g. 'new user signs up, adds a bank account and pays a contact' or 'request money and the other user accepts it'."
argument-hint: "<journey, e.g. 'sign up → onboarding → pay a contact → see it in the feed'>"
allowed-tools: Bash(ls *), Bash(grep *)
---

# /tap-e2e — end-to-end journey

## Goal
Add one well-designed end-to-end journey spec that crosses UI, API and data, uses API shortcuts for
setup and the UI for the behaviour under test, verifies data via the API/`db` fixture, and runs
reliably in its own `e2e` Playwright project.

## Inputs
- `$ARGUMENTS` — the whole text is the journey, as a sequence of user steps or a goal.
- Empty → propose three candidate journeys from the app (e.g. sign-up + onboarding + first payment;
  request → accept by second user → notifications; bank account CRUD + transaction with it) and ask
  the student to pick one.

Current e2e folder and projects (read-only):
- Test folders: !`ls playwright/tests 2>/dev/null || true`
- Projects: !`grep -o 'name: "[^"]*"' playwright/playwright.config.ts 2>/dev/null || true`

## Steps
1. **Design** — delegate to `e2e-architect` with: "Design an e2e journey for: $ARGUMENTS. Output a short
   design (in the spec header comment and in your hand-off): actors/users (seeded users via `users`
   fixture or a new user via the API), preconditions created through `playwright/src/api/*`, UI steps
   using `playwright/src/ui/*` helpers, checkpoints (UI assertion + API/`db` verification per step),
   tags (`@e2e`, plus `@smoke` only for a critical, fast path; `@regression` per suite rules), and the failure signals. Keep it to one
   journey with ≤ 8 steps; split longer journeys."
   Show the design to the student in ≤ 12 lines before implementation if the journey was proposed by you.
2. **Project wiring** — already in place (D-006): journeys live in `playwright/tests/e2e/*.e2e.spec.ts`
   and run in the existing `e2e` project of `playwright/playwright.config.ts` (desktop viewport); the
   `test:e2e` script exists. Reference journey: `playwright/tests/e2e/pay-a-friend.e2e.spec.ts`.
   Do not add a project, folder or decision; only confirm with `npx playwright test --list --project=e2e`.
3. **Implement** — `e2e-architect` writes `playwright/tests/e2e/<journey-slug>.e2e.spec.ts`:
   - import `test`/`expect` from `@fixtures/ui` (gives `page`, `api`, `db`, `users`, auto `seed`);
   - tag with the details object: `test("<journey>", { tag: ["@e2e"] }, async (…) => …)` (`@smoke` only
     for a top critical path); one `test.step("…", …)` per journey step, each ending in an assertion;
   - setup through the API, behaviour through the UI, verification through UI **and** `db`/API;
   - for a second actor use a new browser context (`browser.newContext()` + `exposeAppServices`) or `switchUser`;
   - no page objects, no hard waits; reuse helpers, add new ones to `playwright/src/ui|api` only if generic.
   `e2e-architect` may delegate helper additions to `ui-automation` / `api-automation`, or test data
   design to `data-tester`.
4. **Run** — `npm --prefix playwright run test:e2e -- --repeat-each=2` (or from `playwright/`:
   `npx playwright test --project=e2e --repeat-each=2`) and `npm --prefix playwright run typecheck`.
   Then make sure nothing else broke: `npx playwright test --project=ui-desktop` if shared helpers changed.
   The config writes the list + HTML reporters (`npx playwright show-report`).
5. **Docs** — delegate to `doc-writer`: add the journey (Mermaid sequence diagram: user → UI → API → DB)
   to `tap26/docs/07-testing-framework.md` (e2e section), mention the `e2e` project/`test:e2e` script.
6. **Review** — delegate to `code-reviewer`: review `git diff -- playwright tap26/docs` for journey
   readability, isolation, flake risks (timing, shared state) and FP conventions.

## Quality gates
- `e2e` project exists in `playwright.config.ts` and `npx playwright test --list --project=e2e` lists the spec.
- Gate 4: journey passes 2× in a row; typecheck clean; functional style; `test.step` per step.
- Each journey step has at least one assertion; final state verified through API/`db`, not only the UI.
- Existing projects (`api`, `ui-desktop`, `ui-mobile`) still list the same tests (no accidental testDir overlap).
- Gate 5/6: docs updated (testing doc), `code-reviewer` approve.

## Output
```
Journey   <title>   tags: @e2e [@smoke]
Spec      playwright/tests/e2e/<slug>.e2e.spec.ts   (n steps)
Config    e2e project lists the spec ✓
Run       e2e 1/1 ×2 ✓   typecheck ✓
Docs      tap26/docs/07-testing-framework.md (sequence diagram)
Review    approve
```
Add "How this was done" and how to run it: `npm --prefix playwright run test:e2e`.

## Memory
- `node tap26/scripts/memory.mjs add-fact tests "E2E journey <slug> covers <flow>" --by e2e-architect`
- Flake risks found → `memory.mjs add-learning …`; then `node tap26/scripts/memory.mjs digest`.

## Learn more
- `tap26/docs/07-testing-framework.md`, `tap26/docs/06-workflows.md`, `playwright/README.md`
- Lab: `tap26/labs/lab-12` (e2e journey)
