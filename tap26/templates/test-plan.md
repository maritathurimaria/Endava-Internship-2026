<!--
  Risk-based test plan — used by /tap-test-plan (qa-lead).
  Save as tap26/reports/test-plans/test-plan-<YYYYMMDD-HHmm>-<slug>.md. Replace {{placeholders}}; delete guidance.
  Keep it executable: every high risk → at least one test idea, a level and an owner agent.
-->
# Test plan — {{feature / change}}

| Field | Value |
|---|---|
| Version / date | {{1.0}} / {{YYYY-MM-DD}} |
| Author | {{qa-lead}} |
| Input | {{story path / change description / git diff (impact report path)}} |
| Build | `{{git sha}}` |

## 1. Objective
{{One or two sentences: what decision this plan supports (e.g. "ready to merge the bank-account note field").}}

## 2. Scope
| In scope | Out of scope (why) |
|---|---|
| {{route / screen / machine, with file path}} | {{item}} — {{reason}} |

## 3. Risk matrix
<!-- Likelihood (L) 1–3 × Impact (I) 1–3 = Score. ≥6 high, 3–4 medium, 1–2 low.
     Typical RWA risks: money/balance, authz (other users' data), privacy levels, FE/BE validation drift,
     pagination, notifications, shared JSON DB, mobile layout, contract drift. -->
| ID | Risk | L | I | Score | Mitigation (test idea) | Level | Owner agent |
|---|---|---|---|---|---|---|---|
| R1 | {{risk}} | {{1-3}} | {{1-3}} | {{n}} | {{test idea}} | {{unit/API/UI/e2e/manual/contract/a11y/sec/perf}} | {{agent}} |

## 4. Approach per level
| Level | Tooling / location | What we test here | New / changed |
|---|---|---|---|
| Unit | Vitest — `src/__tests__` | {{…}} | {{n}} |
| API | Playwright `api` — `playwright/tests/api`, helpers `playwright/src/api/*` | {{…}} | {{n}} |
| UI | Playwright `ui-desktop` / `ui-mobile` — `playwright/tests/ui` | {{…}} | {{n}} |
| E2E journey | Playwright `e2e` project — `playwright/tests/e2e/*.e2e.spec.ts` (D-006) | {{…}} | {{n}} |
| Contract | `tap26/openapi/openapi.yaml` + `node tap26/scripts/spec-drift.mjs` | {{…}} | {{yes/no}} |
| Manual / exploratory | charters in `tap26/reports/manual/` | {{…}} | {{n}} |
| Non-functional | /tap-a11y · /tap-security · /tap-perf | {{only where a risk justifies it}} | {{…}} |

## 5. Existing coverage
- {{spec file › describe/test that already covers an area in scope}}

## 6. Test data & environment
- Seeded users (password `s3cret`): {{which and why}} · Reset: `POST /testData/seed`
- New data needed: {{…}} · Mocks/stubs: {{scenario / stubApi}}
- Environment: local `yarn dev` (UI :3000, API :3001); Playwright workers 1; TZ UTC

## 7. Entry criteria
- [ ] {{e.g. Story has acceptance criteria; app starts; `yarn types` clean}}

## 8. Exit criteria
<!-- Measurable and checkable by a command or report. -->
- [ ] All high risks covered by ≥1 passing automated test, green 2 runs in a row
- [ ] `npm --prefix playwright run typecheck` clean; spec-drift clean (API changes)
- [ ] 0 open critical/major bugs in scope
- [ ] {{other}}

## 9. Traceability
| Requirement / risk | Test (file › title or TC id) | Owner | Status |
|---|---|---|---|
| {{AC1 / R1}} | {{…}} | {{agent}} | {{planned / done / failing}} |

## 10. Schedule, roles & reporting
- Order of work: {{agent → agent}} · Report: {{where results go}}

## 11. Assumptions & open questions
- {{…}}
