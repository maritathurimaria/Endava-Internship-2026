---
name: tap-debug
description: "Debug a symptom end-to-end with the debugger agent: reproduce, isolate, find the root cause, apply the minimal fix via the owning agent, add a regression test and record the learning. Handles a failing or flaky Playwright test, an error message or stack trace, or a page/endpoint that does not load. Use when a student says 'this test fails', 'why do I get this error', 'the page is blank', 'it is flaky'."
argument-hint: "failing test <name|file> | error \"<message>\" | page <url or route> | <free-text symptom>"
allowed-tools: Bash(git status *), Bash(head *), Bash(tail *)
---

# /tap-debug — from symptom to root cause to regression test

## Goal
Turn a vague symptom into a proven root cause, the smallest correct fix, a regression test that
would have caught it, and a learning in memory — teaching the debugging method along the way.

## Inputs
`$ARGUMENTS` describes the symptom. Recognised shapes:
- `failing test <title|file>` — e.g. `failing test "creates a new bank account"` or `tests/ui/auth.spec.ts`.
- `error "<message>"` — an error string or pasted stack trace.
- `page <route>` — e.g. `page /bankaccounts` or "the page doesn't load".
- Anything else — treat as free text; the debugger classifies it.
Empty → ask the student ONE question: "What did you do, what did you expect, what happened instead?"

Context at invocation (read-only):
- Pending changes: !`git status --short 2>/dev/null | head -20 || true`
- Last ledger entries: !`tail -8 tap26/memory/changes.md 2>/dev/null || true`

## Steps
1. **Health first.** Delegate to `env-ops`: "Run `node tap26/scripts/doctor.mjs --quick`; report only
   blockers." If the app is down, the symptom may simply be that — use `/tap-run` and re-check.
2. **Reproduce.** Delegate to the `debugger` agent with the symptom `$ARGUMENTS` and this method:
   - Failing test: `cd playwright && npx playwright test <file> -g "<title>" --project=<api|ui-desktop|ui-mobile|e2e>`.
     Flaky suspicion: add `--repeat-each=5` (workers stay 1 — the JSON DB is shared).
     Trace: `npx playwright show-trace test-results/<test-dir>/trace.zip` (traces are kept on failure);
     interactive: `--debug` (Playwright Inspector) or `--headed --project=ui-desktop`.
   - Error message: `grep -rn "<distinctive part>" backend src playwright/src` to find the thrower;
     reproduce the request with `curl -i` (log in first: `curl -c jar -H 'Content-Type: application/json' -d '{"username":"<user>","password":"s3cret"}' http://localhost:3001/login`, then `-b jar`).
   - Page does not load: `curl -i http://localhost:3000<route>`, check the `yarn dev` output (API:
     nodemon/ts-node errors; UI: Vite overlay errors), and the browser console via a short
     Playwright script or `npx playwright test … --headed`.
   Output of this step: a deterministic reproduction command, or proof that it is intermittent with a failure rate.
3. **Isolate.** The `debugger` narrows it down: test vs app vs data vs environment. Evidence to use:
   `git diff` / `git log -p -3 -- <file>`, `tap26/memory/changes.md`, the seed (`POST /testData/seed`),
   selectors in `tap26/knowledge/generated/ui-selectors.md`, routes in `tap26/knowledge/generated/api-routes.md`,
   and `tap26/knowledge/known-issues.md` (the symptom may be a catalogued API defect with a KI id).
4. **Root cause.** The `debugger` states it as "X happens because Y at file:line; evidence: …" and
   proposes the minimal fix. Never accept "add a wait/timeout" or "weaken the assertion" without proof.
5. **Fix via the owner.** Delegate the patch to the agent that owns the file:
   `backend/**` → `be-dev`; `src/**` → `fe-dev`; `playwright/tests/api` or `playwright/src/api` → `api-automation`;
   `playwright/tests/ui` or `playwright/src/ui` → `ui-automation`; env/config → `env-ops`; test data → `data-tester`.
   The debugger may apply a one-line fix itself if trivial and says so.
6. **Regression test.** Delegate to `api-automation` or `ui-automation` (whichever layer reproduces it
   cheapest): add/adjust a test that fails before the fix and passes after. Run it with `--repeat-each=2`.
7. **If the fix touched the API contract**, delegate to `contract-guardian` to update
   `tap26/openapi/openapi.yaml` and run `node tap26/scripts/spec-drift.mjs`.
8. **Learning.** Delegate to `knowledge-curator`: distil the lesson into `learnings.md` (see Memory).

## Quality gates
- Reproduction command recorded before any fix (no fix without a repro, except proven environment issues).
- Gate 1: app starts and `yarn types` passes if `backend/` or `src/` changed.
- Gate 4: regression/changed tests pass twice in a row and `npm --prefix playwright run typecheck` is clean.
- Gate 6: non-trivial fix → `code-reviewer` pass on `git diff`.
- No assertion weakened and no `test.skip`/`test.fixme` added without a documented reason.

## Output
```
Symptom      <as reported>
Reproduce    <command>  → fails n/n
Root cause   <one sentence, file:line>
Fix          <files changed, by which agent>
Regression   <test file › title>  → passes 2/2
Learning     L-### <title>
```
Plus a 3-step "How we found it" for teaching. If unresolved, Status: blocked with the next experiment.

## Memory
- `node tap26/scripts/memory.mjs log-change <file> "fix: <summary>" --by <owner-agent>` for each app file fixed.
- `node tap26/scripts/memory.mjs add-learning "<title>" --what "<symptom>" --lesson "<root cause + fix>" --tags debug,<area> --applies debugger,<agents> --by knowledge-curator`
- Open doubt → `node tap26/scripts/memory.mjs add-question "<q>" --by debugger`; then `memory.mjs digest`.

## Learn more
- `tap26/docs/06-workflows.md` (debugging workflow), `tap26/docs/13-troubleshooting.md`, `tap26/docs/07-testing-framework.md`
- `playwright/README.md`; Playwright trace viewer: https://playwright.dev/docs/trace-viewer
- Lab: `tap26/labs/lab-13` (debugging)
