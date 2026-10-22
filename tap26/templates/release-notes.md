<!--
  Release notes — used by doc-writer (/tap-docs). Audience: students and reviewers, not machines.
  Group by user-visible impact; link to PRs, stories, bugs. Use Keep-a-Changelog style headings.
-->
# Release notes — {{product: RWA app / TAP26-Junior}} {{version}} ({{YYYY-MM-DD}})

## Highlights
<!-- 1–3 bullets a student would care about most. -->
- {{…}}

## Added
- {{feature}} — {{one-line user benefit}} ({{STORY-### / PR / EP-###}})

## Changed
- {{behaviour change}} — {{what users/tests must do differently}}

## Fixed
- {{BUG-### / KI-## title}} — {{what is now correct}}

## API & contract
| Change | Path | Breaking? | OpenAPI updated |
|---|---|---|---|
| {{added field `note`}} | `{{POST /bankAccounts}}` | {{no}} | {{yes}} |

## UI & selectors
- New `data-test` ids: {{…}} · Removed/renamed: {{… → run /tap-sync-tests}}

## Tests
- {{n}} API, {{n}} UI tests added/updated · suites green: {{api ✅ ui-desktop ✅ ui-mobile ✅}}

## Known issues
- {{open bugs / KI-## still present}}

## Upgrade / migration notes
- {{e.g. reseed the DB: `POST /testData/seed`; reinstall Playwright browsers}}

## Contributors
- {{student}} with TAP26 agents: {{list}}
