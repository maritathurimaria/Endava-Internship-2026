<!--
  Test impact report — used by test-impact-analyst (/tap-sync-tests, /tap-change-api, /tap-change-ui).
  Save as tap26/reports/impact/impact-<YYYYMMDD-HHmm>-<slug>.md (D-007).
  Inputs: `node tap26/scripts/impact.mjs [--since <ref>]`, git diff, tap26/memory/changes.md,
  tap26/knowledge/generated/*.md.
-->
# Test impact — {{change name}} ({{YYYY-MM-DD}})

| Field | Value |
|---|---|
| Diff | `{{git diff HEAD / --since <ref>}}` — {{n}} files |
| Ledger entries | {{changes.md lines in scope}} |
| Generated knowledge | {{scan date — run /tap-scan if stale}} |

## Summary
{{2–3 sentences: what changed in the app and how much of the suite it touches.}}

## App changes
| File | Kind | What changed |
|---|---|---|
| `{{backend/bankaccount-routes.ts}}` | {{API route / validator / db / UI component / machine / seed}} | {{…}} |

## Impacted contract
| Route | Change | OpenAPI updated | spec-drift |
|---|---|---|---|
| `{{POST /bankAccounts}}` | {{new field / status code}} | {{yes/no}} | {{clean/drift}} |

## Impacted selectors
| `data-test` id | Change | Referenced by |
|---|---|---|
| `{{bankaccount-note-input}}` | {{added / removed / renamed}} | {{playwright/tests/ui/…, playwright/src/ui/…}} |

## Impacted tests
| Test (file › title) | Impact | Action | Owner |
|---|---|---|---|
| {{…}} | {{breaks / incomplete / unaffected but related}} | {{update / add / delete (needs OK) / none}} | {{api-automation / ui-automation}} |

## New tests needed
- {{level}} — {{behaviour}} — {{target file}}

## Update plan (ordered)
1. {{agent}}: {{task}}
2. {{…}}

## Verification
- {{commands to run after updates, e.g. npx playwright test tests/api/bankaccounts.api.spec.ts --project=api ×2}}

## Risks
- {{e.g. mobile layout not covered; GraphQL variant untested}}
