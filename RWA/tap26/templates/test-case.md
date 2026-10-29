<!--
  Manual test case template — used by /tap-test-cases (format "steps").
  Save as tap26/reports/manual/manual-<YYYYMMDD-HHmm>-tc-<feature-slug>.md (D-007). One file per feature; repeat the case block per case.
  Design techniques to name per case: EP (equivalence partition), BVA (boundary value), ST (state transition),
  DT (decision table), EG (error guessing).
-->
# Test cases — {{feature / screen}}

| Field | Value |
|---|---|
| Feature / screen | {{e.g. Bank accounts — /bankaccounts/new}} |
| Code under test | {{e.g. src/components/BankAccountForm.tsx, backend/bankaccount-routes.ts, backend/validators.ts}} |
| Source of truth | {{story / OpenAPI path / UI copy}} |
| Author / date | {{manual-tester or student}} / {{YYYY-MM-DD}} |
| Existing automation | {{spec files that already cover this area, e.g. playwright/tests/ui/bankaccounts.spec.ts}} |

## Shared preconditions
- Database reset: `POST http://localhost:3001/testData/seed` (wipes manual data)
- User: {{seeded username}} / `s3cret` · Viewport: {{1280×1000 | 375×667}}

---

## TC-{{AREA}}-{{001}} — {{title: action + condition + expected outcome}}
| Priority | Technique | Automation candidate |
|---|---|---|
| {{P1/P2/P3}} | {{EP / BVA / ST / DT / EG}} | {{yes/no — why}} |

**Preconditions:** {{specific state beyond the shared ones}}
**Test data:** {{exact values, e.g. routingNumber = "12345678" (8 chars, below boundary)}}

| # | Step | Expected result |
|---|---|---|
| 1 | {{action, referencing `data-test` id or visible label}} | {{observable result — text, element, URL, status}} |
| 2 | {{action}} | {{observable result}} |
| 3 | {{action}} | {{observable result}} |

**Postconditions / cleanup:** {{e.g. reseed}}
**Traceability:** {{requirement / story / bug id}} · **Covered by automation:** {{spec › test title, or "no"}}

<!-- Execution log (fill when run) -->
| Run date | Build (sha) | Result | Notes / bug id |
|---|---|---|---|
| {{YYYY-MM-DD}} | {{sha}} | {{pass / fail / blocked}} | {{BUG-###}} |

---
<!-- Copy the block above for the next case: TC-{{AREA}}-002 … -->

## Coverage summary
| Partition / rule | Cases |
|---|---|
| {{e.g. routingNumber length: <9 / =9 / >9}} | {{TC ids}} |

## Notes
- FE (Yup) vs BE (express-validator) differences found: {{list or "none"}}
