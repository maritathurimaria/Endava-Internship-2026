<!--
  Bug report template — used by /tap-bug (manual-tester writes, debugger may confirm root cause).
  Save as tap26/reports/bugs/BUG-###-<short-slug>.md. Replace every {{placeholder}}; delete guidance comments.
  Rule of thumb: a developer who has never seen this bug must reproduce it in 2 minutes from this file.
-->
# BUG-{{###}} — {{short, specific title: <where> <what goes wrong> <when>}}
<!-- Good: "POST /bankAccounts accepts an 8-character routingNumber that the UI rejects". Bad: "Bank account broken". -->

| Field | Value |
|---|---|
| Status | {{new / confirmed / cannot-reproduce / fixed / closed}} |
| Severity | {{critical / major / minor / trivial}} — {{why, one line}} |
| Priority | {{P1 / P2 / P3}} — {{why, one line}} |
| Area | {{API route, screen, component or machine, e.g. `POST /transactions`, `TransactionCreateStepTwo.tsx`}} |
| Reported by / date | {{agent or student}} / {{YYYY-MM-DD}} |
| Related | {{KI-## from tap26/knowledge/known-issues.md, story, test case id, other BUG-### — or "none"}} |
| Reproduction rate | {{e.g. 3/3}} |

## Environment
- Commit: `{{git rev-parse --short HEAD}}` · Branch: `{{branch}}`
- App: UI http://localhost:3000 · API http://localhost:3001 · DB reseeded before repro: {{yes/no}}
- Browser / viewport: {{chromium 1280×1000 / 375×667 / API only}} · OS: {{os}} · Node: {{version}}
- User: {{seeded username}} (password `s3cret`)

## Preconditions
<!-- State needed before step 1, e.g. "Logged in as Heath93; has 1 bank account (seed)". -->
- {{precondition}}

## Steps to reproduce
<!-- Numbered, one action per step, exact values. For API bugs include method, path and body. -->
1. {{step}}
2. {{step}}
3. {{step}}

## Expected result
{{what should happen}} — source: {{OpenAPI / UI copy / story / validator / common expectation (say so)}}

## Actual result
{{what actually happens — exact message, status code, value}}

## Evidence
<!-- Trim bodies to the relevant fields. Screenshots under tap26/reports/bugs/evidence/BUG-###/. -->
```http
{{METHOD}} {{/path}}
{{request body}}

→ {{status}}
{{trimmed response body}}
```
- Screenshot / trace: `{{tap26/reports/bugs/evidence/BUG-###/...}}`
- `data-test` elements involved: `{{ids}}`

## Impact
{{who is affected, how badly, workaround (if any)}}

## Root cause (confirmed by debugger)
<!-- Optional. Filled only by the debugger after /tap-bug verify. Cite file:line; propose, don't apply. -->
- Location: `{{file:line}}`
- Explanation: {{why it happens}}
- Proposed fix: {{prose or small diff}}

## Regression test
- {{`playwright/tests/api/<file>.spec.ts` › "BUG-### <expected behaviour>" (asserts correct behaviour, marked `test.fail(true, 'BUG-###: …')` until fixed — D-005) — or "not yet"}}

## Notes
{{anything else: first seen, related logs, open questions}}
