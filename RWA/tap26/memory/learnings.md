# Learnings

Format: `## L-### Title` · Tags · What happened · Lesson · Applies to · Date · Source.

## L-001 The mobile drawer backdrop centre is covered by the drawer
- Tags: ui, mobile, playwright
- What happened: Closing the side nav by clicking `.MuiBackdrop-root` (force) at 375px landed on the drawer panel; Escape did not close it either.
- Lesson: Click the backdrop's uncovered right edge (`closeSideNavOnMobile` in playwright/src/ui/navigation.ts) and make open/close helpers idempotent.
- Applies to: ui-automation, e2e-architect, debugger
- Date: 2026-10-16 · Source: tap26-setup

## L-002 Clicking "Sign Up" can be swallowed by blur validation
- Tags: ui, forms, flakiness
- What happened: The username field is autofocused; the first click blurs it, Formik shows "Username is required" and the layout shift moves the link mid-click.
- Lesson: Retry the navigation click until the URL changes (`openSignUp` uses `expect(...).toPass()`), never add hard waits.
- Applies to: ui-automation, manual-tester
- Date: 2026-10-16 · Source: tap26-setup

## L-003 Re-clicking the selected feed tab does not refetch
- Tags: ui, network, playwright
- What happened: Waiting for /transactions/public after clicking the already-selected "Everyone" tab hung.
- Lesson: When the tab is already selected, reload the page to trigger the request (see `openFeedAndRead` in transaction-feeds.spec.ts).
- Applies to: ui-automation
- Date: 2026-10-16 · Source: tap26-setup

## L-004 Start waiting for a response before the action
- Tags: playwright, network
- What happened: Responses fired during login were missed when `waitForResponse` was started afterwards.
- Lesson: `const res = waitForApi(page, …); await action(); await res;` — the Playwright equivalent of `cy.intercept().as()` + `cy.wait()`.
- Applies to: api-automation, ui-automation, e2e-architect
- Date: 2026-10-16 · Source: tap26-setup

## L-005 `pkill -f <pattern>` can kill the shell that runs it
- Tags: env, shell
- What happened: `pkill -f "playwright test"` matched its own command line and terminated the calling shell (exit 144).
- Lesson: Kill by PID or use a pattern that cannot match the invoking command (e.g. `pgrep -f "[p]laywright test"`).
- Applies to: env-ops, debugger
- Date: 2026-10-16 · Source: tap26-setup

## L-006 Document actual behaviour, then fix deliberately
- Tags: api,contract,process
- What happened: n/a
- Lesson: When the API misbehaves (e.g. unknown id updates the first record), the OpenAPI spec records the real behaviour and links a KI id, while tests assert the correct behaviour under test.fail('KI-xx') (see D-005); fixes happen as explicit changes so tests, spec and docs move together.
- Applies to: contract-guardian,api-automation,be-dev,security-tester
- Date: 2026-10-16 · Source: contract-guardian

## L-007 Cypress spec title points at the wrong route
- Tags: tests,coverage
- What happened: cypress/tests/api/api-bankaccounts.spec.ts:76 titles a bank-account delete test 'DELETE /contacts/:bankAccountId', so title-based coverage mapping attributes it to the contacts route.
- Lesson: Coverage by title matching is heuristic; check the request actually made. Good first-fix exercise for students.
- Applies to: test-impact-analyst,qa-lead
- Date: 2026-10-16 · Source: test-impact-analyst

## L-008 VS Code tasks: use process type for node, end dev task on Vite output
- Tags: vscode,env
- What happened: n/a
- Lesson: Tasks that run node -e should be type 'process' with args (avoids PowerShell/cmd quoting); the RWA backend logs nothing when it starts listening, so a background 'yarn dev' task must end on Vite's 'ready in'.
- Applies to: env-ops
- Date: 2026-10-16 · Source: env-ops

## L-009 Verify mocks and fixtures by byte-comparing with the real API
- Tags: mocks,fixtures,contract
- What happened: The first fixture build ordered the personal feed received-then-sent; comparing with the live response showed the API returns each feed newest modifiedAt first
- Lesson: After building a fixture or a stateful mock route, diff it against the real response (seeded DB, same user) — JSON.stringify equality caught ordering bugs that a schema check would miss
- Applies to: mock-smith,data-tester,contract-guardian
- Date: 2026-10-16 · Source: mock-smith

## L-010 Factories must omit undefined keys for notification variants
- Tags: factories,ui
- What happened: The UI classifies notifications with lodash has('status'|'likeId'|'commentId'), so a key present with value undefined changes the rendered text
- Lesson: Build notification objects without the keys of other variants (compact the object); test that buildNotification({kind:'like'}) has no 'status' property
- Applies to: mock-smith,ui-automation
- Date: 2026-10-16 · Source: mock-smith

## L-011 Killing npx does not stop the server it started
- Tags: env,processes
- What happened: kill <npx pid> left the vite child running on its port; the next start failed with 'Port already in use'
- Lesson: Start servers with node <bin> directly, or find the listener by port/args (ps -eo pid,args | grep '[v]ite') and kill that PID
- Applies to: env-ops,debugger
- Date: 2026-10-16 · Source: mock-smith
