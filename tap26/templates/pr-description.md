<!--
  Pull request description — used by doc-writer / orchestrator when the student is ready to open a PR.
  Keep the summary readable in 30 seconds; details below. Delete sections that don't apply.
-->
## Summary
{{One to three sentences: what changed and why (user-visible effect first).}}

Closes {{issue / STORY-### / BUG-### / EP-###}}

## Type of change
- [ ] Feature  - [ ] Bug fix  - [ ] Tests only  - [ ] Docs  - [ ] Refactor (no behaviour change)  - [ ] TAP26 framework

## Changes
| Area | Files | Notes |
|---|---|---|
| API | {{backend/…}} | {{route/validator/db change}} |
| Contract | {{tap26/openapi/openapi.yaml}} | {{paths/fields}} |
| UI | {{src/…}} | {{new/changed `data-test` ids}} |
| Tests | {{playwright/tests/…}} | {{added/updated}} |
| Docs | {{tap26/docs/… / README}} | {{…}} |

## How it was verified
<!-- Commands actually run, with counts. BLUEPRINT §7 gates. -->
- [ ] `yarn types` → {{clean}}
- [ ] `node tap26/scripts/spec-drift.mjs` → {{clean / n/a}}
- [ ] `npx playwright test --project=api` → {{n passed}} (×2)
- [ ] `npx playwright test --project=ui-desktop` → {{n passed}} (×2) · ui-mobile: {{n passed / n/a}}
- [ ] `npm --prefix playwright run typecheck` → {{clean}}
- [ ] Code review: `tap26/reports/reviews/{{file}}` → {{approve}}

## Screenshots / evidence
{{before/after images or response samples — or "n/a"}}

## Risks & rollback
- Risk: {{…}} · Rollback: {{revert commit; reseed DB}}

## Test impact
- Selectors added/removed: {{…}} · Tests updated by /tap-sync-tests: {{…}}

## How this was done (TAP26)
- Agents: {{be-dev → contract-guardian → api-automation → doc-writer → code-reviewer}}
- Memory: {{L-### / D-### / changes.md}}

## Reviewer notes
{{where to start reading, open questions}}
