<!--
  Exploratory testing charter + session sheet — used by /tap-test-cases (format "charter").
  Save as tap26/reports/manual/manual-<YYYYMMDD-HHmm>-charter-<slug>.md (D-007). The charter is written BEFORE the session;
  the session sections are filled DURING/AFTER it (session-based test management, SBTM).
-->
# Charter CH-{{###}} — {{short name}}

> **Explore** {{target: screen, flow, API area — e.g. "the 3-step New Transaction flow"}}
> **with** {{resources: users, data, tools, viewport — e.g. "Heath93 + Arvilla_Hegmann, 375×667, DevTools network tab"}}
> **to discover** {{information sought — e.g. "how amount and description validation and errors behave"}}

| Field | Value |
|---|---|
| Timebox | {{30 / 60 / 90 min}} |
| Tester | {{name/agent}} |
| Date | {{YYYY-MM-DD}} |
| Build | `{{git sha}}` · DB reseeded: {{yes/no}} |
| Related | {{story, test plan, risk ids}} |

## Areas & code pointers
- {{e.g. src/components/TransactionCreateStepTwo.tsx · src/machines/createTransactionMachine.ts · POST /transactions}}

## Tour ideas
<!-- Pick 3–5; tick what you actually covered. -->
- [ ] Data tour — boundaries, empty, huge, unicode, negative, decimals ({{field list}})
- [ ] Error tour — invalid inputs, server errors (stub with `stubApi`), network offline
- [ ] Interruption tour — back button, refresh mid-flow, logout in another tab
- [ ] Mobile tour — 375×667, drawers, touch targets
- [ ] Permissions tour — other user's resources, logged-out access
- [ ] {{custom tour}}

## Session notes
<!-- Timestamped, terse. Prefix: T = test idea, O = observation, ? = question, ! = possible bug -->
- {{hh:mm}} T {{…}}
- {{hh:mm}} O {{…}}

## Bugs found
| Id | Title | Severity |
|---|---|---|
| {{BUG-### or "draft"}} | {{title}} | {{severity}} |

## Questions
- {{question for BA/dev — log with `node tap26/scripts/memory.mjs add-question`}}

## Session metrics
| Setup % | Testing % | Bug investigation % | Charter vs opportunity % |
|---|---|---|---|
| {{n}} | {{n}} | {{n}} | {{n / n}} |

## Debrief
- What I covered: {{…}}
- What I didn't cover (and why): {{…}}
- Follow-up charters / automation ideas: {{…}}
