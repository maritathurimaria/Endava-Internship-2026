<!--
  Code review report — produced by code-reviewer via /tap-review (saved by the main thread).
  Save as tap26/reports/reviews/review-<YYYYMMDD-HHmm>-<scope-slug>.md (D-007).
  Checklist: .claude/skills/tap-review/checklist.md. Severity: blocker / major / minor / nit.
-->
# Review — {{scope, e.g. "uncommitted changes vs HEAD" or "main..lab/07-nickname"}}

| Field | Value |
|---|---|
| Verdict | {{approve / approve-with-comments / request-changes}} |
| Reviewer | code-reviewer |
| Date | {{YYYY-MM-DD HH:MM}} |
| Diff | `{{git diff command}}` — {{n}} files, +{{n}} / −{{n}} |
| Findings | blocker {{n}} · major {{n}} · minor {{n}} · nit {{n}} |

## Summary
{{2–3 sentences: what the change does, overall quality, the one thing that must change (if any).}}

## Files reviewed
| File | Status | Notes |
|---|---|---|
| `{{path}}` | {{reviewed / skipped (why)}} | {{…}} |

## Findings
<!-- Ordered by severity. One block per finding. -->
### [{{blocker|major|minor|nit}}] {{short title}}
- Where: `{{file:line}}`
- What: {{what is wrong}}
- Why it matters here: {{impact in this app}}
- Suggestion:
```{{ts}}
{{≤ 10-line fix}}
```

## Quality gates (BLUEPRINT §7)
| Gate | Applies | Status | Evidence |
|---|---|---|---|
| App starts / `yarn types` | {{y/n}} | {{✅/❌/❔}} | {{…}} |
| OpenAPI + spec-drift | {{y/n}} | {{…}} | {{…}} |
| `data-test` contract / tests updated | {{y/n}} | {{…}} | {{…}} |
| Tests green ×2, functional style, typecheck | {{y/n}} | {{…}} | {{…}} |
| Docs + change ledger | {{y/n}} | {{…}} | {{…}} |

## What's good
- {{specific praise, with file reference}}
- {{…}}

## Questions for the author
- {{…}}

## Suggested next steps
- {{finding → owning agent / skill}}
