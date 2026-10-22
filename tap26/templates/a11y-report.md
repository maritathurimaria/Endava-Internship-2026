<!--
  Accessibility report — used by /tap-a11y (a11y-auditor).
  Save as tap26/reports/a11y/a11y-<YYYYMMDD-HHmm>-<scope>.md (D-007). Standard: WCAG 2.2 AA.
  Severity (axe impact scale): critical / serious / moderate / minor.
-->
# Accessibility audit — {{scope}} ({{YYYY-MM-DD}})

| Field | Value |
|---|---|
| Screens | {{/signin, /signup, /, /transaction/new …}} |
| Viewports | {{1280×1000, 375×667}} |
| Build | `{{git sha}}` |
| Tools | {{@axe-core/playwright x.y (tags wcag2a, wcag2aa, wcag21aa, wcag22aa) · keyboard · zoom 200%}} |
| User | {{seeded username}} |
| Previous report | {{path or "none"}} |

## Summary
{{2–3 sentences: overall state, the worst barrier and who it affects.}}

| Screen | Critical | Serious | Moderate | Minor | Manual issues |
|---|---|---|---|---|---|
| {{/signin}} | {{n}} | {{n}} | {{n}} | {{n}} | {{n}} |

## Findings
<!-- One block per confirmed issue; automated findings must be confirmed manually (MUI portals → false positives). -->
### A11Y-{{##}} [{{severity}}] {{short title}}
- WCAG: {{SC number + name, e.g. 4.1.2 Name, Role, Value}}
- Screen / element: {{route}} · `{{data-test id or role+name}}` · source `{{src/components/…:line}}`
- Found by: {{axe rule id / manual keyboard / zoom}}
- Who is affected: {{screen-reader users / keyboard-only / low vision …}}
- Evidence: {{snippet, screenshot path}}
- Fix: {{concrete change for fe-dev}}

## Manual checks
| Check | Result | Notes |
|---|---|---|
| Keyboard-only completes the flow | {{pass/fail}} | {{…}} |
| Visible focus on every interactive element | {{…}} | {{…}} |
| Dialogs/drawers trap and return focus | {{…}} | {{…}} |
| Form errors announced and associated | {{…}} | {{…}} |
| Contrast ≥ 4.5:1 text / 3:1 UI | {{…}} | {{…}} |
| Reflow at 320 CSS px / zoom 200% | {{…}} | {{…}} |
| Page titles & heading order | {{…}} | {{…}} |

## Known issues (unchanged since last report)
- {{A11Y-## — still present}}

## Tests
- {{playwright/tests/ui/a11y.spec.ts — n tests, allow-list: …}} or "not requested"

## Recommendations (priority order)
1. {{quick win}}
2. {{…}}
