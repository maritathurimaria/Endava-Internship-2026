# Lab 11 — Mocks and stubs: empty and error states

**Level:** ★★★ · **Time:** 60–90 min · **Tracks:** Tester, Developer, Full
**Skills/agents practised:** `/tap-mocks`, `/tap-new-test`, `/tap-bug`, `/tap-ask ux` · `mock-smith`, `ui-automation`, `ux-designer`, `manual-tester`

## Learning objectives

1. Render UI states that are hard to reach with real data (empty list, server error) using Playwright stubs.
2. Use the spec-driven **mock server** (:3101) and its scenarios to explore API responses without touching real data.
3. Decide when to stub (fast, isolated) and when to hit the real API (realistic, slower).
4. Turn a surprising state into a UX finding or bug report.

## Prerequisites

- [Lab 06](lab-06-first-ui-test.md), [Lab 10](lab-10-swagger.md). App running.

## Background

Two tools, two layers:

- **Playwright stubs — for UI states** (`playwright/src/ui/network.ts`): `stubApi(page, matcher, body, status)`
  answers a browser request without touching the server; `transformApi` lets the request through and
  edits the JSON. Reusable response builders/factories live in `playwright/src/mocks/` (maintained by
  `mock-smith`). Stubs are per-test and invisible to other tests.
- **Mock server — for API exploration** (`node tap26/scripts/mock-server.mjs`, http://localhost:3101): a
  stand-alone fake API generated from the OpenAPI spec. Pick a **scenario** per request with the
  `x-mock-scenario` header or the `__scenario` query parameter. Scenarios and fixtures live in
  `tap26/mocks/`. The UI is hard-wired to the real API port, so **the app cannot be pointed at the
  mock server** — use it with `node`/Swagger-style requests and to design stub bodies.

The screen: **Notifications** (`/notifications`). The list comes from `GET /notifications`
(`{ results: [...] }`) through an XState data machine (`src/machines/dataMachine.ts`) that has a
`failure` state. `NotificationList.tsx` renders `EmptyList` ("No Notifications",
`data-test="empty-list-header"`) when the list is empty.

## Steps

### 0. Branch

```bash
git switch -c lab/11-mocks
```

### 1. Read the existing empty-state test critically (human step)

Open `playwright/tests/ui/notifications.spec.ts`, find *"renders an empty notifications state"*.
Read every assertion. Now open `src/components/NotificationList.tsx`. **Does every selector in the
test exist in the component?** Write down what you find — you'll use it in step 6.

### 2. Start the mock server and list its scenarios

```
/tap-run mock
```

(or task **TAP: Mock server**), then:

```
/tap-mocks server
```

(no scenario name → it lists the available scenarios). Or ask in plain English: *"Ask mock-smith which
mock-server scenarios exist for GET /notifications and how to call each one."*

Built-in scenarios are `empty`, `error` (500 for every request), `slow` and `status-<code>`; extra
ones are JSON files in `tap26/mocks/scenarios/` (e.g. `empty-notifications`, `server-error-transactions`). Like the real API, the mock needs a login first. Try `empty` and
`error` yourself (one line; it logs in, then calls the endpoint twice):

```bash
node -e "const M='http://localhost:3101';(async()=>{const l=await fetch(M+'/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'Heath93',password:'s3cret'})});const c=(l.headers.get('set-cookie')||'').split(';')[0];for(const s of ['empty','error']){const r=await fetch(M+'/notifications?__scenario='+s,{headers:{cookie:c}});console.log(s,r.status,await r.text())}})()"
```

**Expected:** `empty 200 { "results": [] }` and `error 500 { "error": "Internal Server Error", "scenario": "error" }`.
These are exactly the bodies you will stub in the browser next.

### 3. Stub the empty state in a UI test

Optionally let `mock-smith` build a reusable stub first (it lands in `playwright/src/mocks/`):

```
/tap-mocks stub GET /notifications empty
```

```
/tap-new-test ui in playwright/tests/ui/notifications-states.spec.ts (use stubApi and, if useful, a response factory from playwright/src/mocks), log in as users[0] with loginByXstate, stub GET /notifications with stubApi to return { results: [] } and assert the empty state: empty-list-header contains "No Notifications", notifications-list is not rendered and the nav-top-notifications-count badge shows no number. Desktop and mobile.
```

### 4. Stub a 500 and observe what the app does

```
/tap-new-test ui in the same spec, stub GET /notifications with status 500 and body { error: "boom" }. First, only open the page and report what the UI shows — do not assert yet.
```

**Observe:** the app shows *"No Notifications"* — the same as the empty state — although the server
failed. Is that acceptable? Ask the designer:

```
/tap-ask ux the notifications page shows "No Notifications" when GET /notifications fails with 500. Is that a problem? Propose the error-state copy and behaviour.
```

### 5. File the finding, then finish the test

```
/tap-bug notifications page shows the empty state instead of an error when GET /notifications returns 500
```

The report lands in `tap26/reports/bugs/BUG-###-<slug>.md`. Following decision **D-005**, the test asserts
the **correct** behaviour and is marked as an expected failure until the bug is fixed:

```
Finish the 500 test per D-005: assert that an error message is shown and the "No Notifications" empty state is NOT shown, and mark it test.fail(true, '<the BUG id>: empty state shown on 500'). Run it twice on desktop and mobile.
```

### 6. Fix the weak assertion you found in step 1

```
/tap-ask ui-auto in tests/ui/notifications.spec.ts "renders an empty notifications state", is expect(bySel(page, "notification-list")).toHaveCount(0) a meaningful assertion? Compare with src/components/NotificationList.tsx.
```

If you agree it's vacuous (it can never fail), have it fixed:

```
/tap-new-test ui fix that assertion to use the real selector notifications-list, run the test twice, and prove it can fail by temporarily stubbing one notification.
```

## ✅ Checkpoints

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Mock server up | `node -e "fetch('http://localhost:3101/notifications').then(r=>console.log(r.status))"` | `401` (up, and enforcing login like the real API) |
| 2 | New spec green ×2 desktop | in `playwright/`: `npx playwright test tests/ui/notifications-states.spec.ts --project=ui-desktop --repeat-each=2` | `0 failed` |
| 3 | …and mobile | same with `--project=ui-mobile` | `0 failed` |
| 4 | Uses stubs, not DB edits | `node -e "const s=require('fs').readFileSync('playwright/tests/ui/notifications-states.spec.ts','utf8');console.log(s.includes('stubApi'), /status.*500|500/.test(s))"` | `true true` |
| 5 | Vacuous assertion fixed | `git grep -n --untracked "\"notification-list\"" -- playwright/tests` | no output |
| 6 | Bug report | `node -e "console.log(require('fs').readdirSync('tap26/reports/bugs'))"` | a `BUG-###-….md` with expected vs actual, steps, severity |
| 7 | Defect marked per D-005 | `node -e "console.log(/test\.fail\(true/.test(require('fs').readFileSync('playwright/tests/ui/notifications-states.spec.ts','utf8')))"` | `true` |

## Stretch goals

- Use `transformApi` to keep the real notifications but rename one user to a 60-character name. Does
  the layout survive on `ui-mobile`?
- Compare layers: fetch the mock server's *empty* scenario for `GET /notifications` and use exactly that
  body in your `stubApi` call. Why is a spec-derived body safer than a hand-written one?
- Ask `mock-smith` to add a new scenario `notifications-many` (60 unread) and a test that the badge shows `60`.

## Reflection questions

1. The weak assertion in step 1 passed for months. What process (human or agent) would have caught it?
2. Stub vs. mock server vs. real API: for each of the three tests you wrote, which layer was right and why?
3. The agent was told to *observe before asserting* in step 4. What would have happened if you had
   asked it to "test the error state" directly?
4. What context did `mock-smith` need to list scenarios correctly — the spec, the scenario files, or both?

## Reset

```bash
git restore data/database.json
git add -A && git commit -m "lab 11: notification states with stubs + mock scenarios"
git switch tap26-base
```

Stop the mock server task when done.

## Instructor notes

- The existing test asserts `bySel(page, "notification-list")` → count 0, but the component's selector is
  `notifications-list` (plural). The assertion can never fail. The Cypress original has the same shape;
  this is a nice "tests need tests" moment (mutation thinking).
- Data machine: on 500 the `loading` state goes to `failure` and `results` stays `[]`, so
  `NotificationList` renders `EmptyList`. There is no error UI — finding for the UX/bug step.
- `stubApi(page, { method: "GET", path: "/notifications" }, { error: "boom" }, 500)` — the 4th arg is the status.
- UI states must use Playwright stubs (`stubApi`/`transformApi` + `playwright/src/mocks`); the mock
  server is for API exploration only — the UI calls the API on its configured port directly.
- Scenario names: built-ins `empty`, `error`, `slow`, `status-<code>` plus files in `tap26/mocks/scenarios/`;
  `GET http://localhost:3101/__mock/routes` lists routes and scenarios. A 401 from the mock means the
  student skipped the login — it enforces the session cookie like the real API.
- The badge (`nav-top-notifications-count`) is an MUI `Badge`; with 0 items its content is
  `undefined`, so assert on text being empty rather than on visibility.
