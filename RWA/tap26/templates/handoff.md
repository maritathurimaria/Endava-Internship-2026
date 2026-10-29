<!--
  Hand-off report — BLUEPRINT §7. EVERY delegated agent ends its work with this block.
  The orchestrator checks it against the quality gates before declaring the work done.
  Keep it short: counts and paths, not walls of logs. Replace every {{placeholder}}.
-->
## Hand-off — {{agent-name}}
Status: {{done | partial | blocked}}
Changed files: {{comma-separated repo-relative paths, or "none"}}
Verification: {{commands run + results, e.g. "npx playwright test tests/api/users.api.spec.ts --project=api → 6 passed (2 runs); npm --prefix playwright run typecheck → clean"}}
Risks / follow-ups: {{what could break, what is left to do, assumptions made — or "none"}}
Memory updated: {{ids/files, e.g. "L-007, D-005, changes.md (2 lines)" — or "none"}}
Next suggested agent: {{agent name + why, e.g. "code-reviewer — non-trivial backend change" — or "none"}}

<!--
  Guidance
  - Status:
      done     = acceptance criteria met and verified
      partial  = some criteria met; list what is missing under Risks / follow-ups
      blocked  = cannot proceed; say exactly what is needed (decision, access, another agent)
  - Verification must be commands you actually ran in this task, with their result.
    "Should work" is not verification.
  - Quality gates to self-check (BLUEPRINT §7):
      1. App change      → app still starts; `yarn types` passes for touched TS
      2. API change      → tap26/openapi/openapi.yaml updated; `node tap26/scripts/spec-drift.mjs` clean; API tests green
      3. UI change       → data-test contract preserved or tests updated; ui-desktop green (+ ui-mobile if layout)
      4. New/changed tests → green twice in a row; functional style; typecheck clean
      5. User-visible change → docs updated; change recorded in tap26/memory/changes.md
      6. Non-trivial change → independent code-reviewer pass
  - Memory: write via `node tap26/scripts/memory.mjs …` and list the ids it printed.

  Example
  ## Hand-off — api-automation
  Status: done
  Changed files: playwright/tests/api/bankaccounts.api.spec.ts
  Verification: npx playwright test tests/api/bankaccounts.api.spec.ts --project=api → 9 passed ×2; typecheck clean
  Risks / follow-ups: GraphQL variant of the new field not covered (needs be-dev to expose it first)
  Memory updated: changes.md (1 line), L-008
  Next suggested agent: code-reviewer
-->
