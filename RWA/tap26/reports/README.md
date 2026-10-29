# tap26/reports — generated outputs

Everything TAP26 agents and skills **generate** lands here: audits, bug reports, reviews, research,
test plans and analysis. Most reports are working artefacts for one student's machine and are
**gitignored** — share one by copying it into a PR, an issue or `tap26/docs/`. Two types are
**committed** because they are evidence for the self-learning loop and are referenced from tests:
`bugs/` (`BUG-###-<slug>.md`, cited by `test.fail(true, "BUG-###: …")`) and `retros/` (cited by
evolution proposals).

## Naming (decision D-007)
- One subfolder per report type: `tap26/reports/<type>/`.
- File name: `<type>-<YYYYMMDD-HHmm>-<slug>.md` — e.g. `review-20261016-1430-bank-account-note.md`.
- Exception: bugs use a stable id — `BUG-###-<slug>.md` (next number = highest existing + 1).
- Templates for most reports live in `tap26/templates/`.

## Subfolders
| Folder | What goes in it | Produced by (skill → agent) | Template |
|---|---|---|---|
| `bugs/` | Reproducible bug reports `BUG-###-<slug>.md`; evidence in `bugs/evidence/BUG-###/` | `/tap-bug` → manual-tester, debugger | `bug-report.md` |
| `manual/` | Manual test cases, Gherkin scenarios, exploratory charters + session notes | `/tap-test-cases` → manual-tester | `test-case.md`, `exploratory-charter.md` |
| `reviews/` | Independent code reviews with verdict and findings | `/tap-review` → code-reviewer | `review-report.md` |
| `research/` | Cited research and analysis reports | `/tap-research` → researcher | `research-report.md` |
| `a11y/` | WCAG 2.2 AA audits (axe + manual checks) | `/tap-a11y` → a11y-auditor | `a11y-report.md` |
| `security/` | Local-only security assessments; throwaway probes in `security/scratch/` | `/tap-security` → security-tester | `security-report.md` |
| `perf/` | Performance smoke results and baselines | `/tap-perf` → perf-tester | `perf-report.md` |
| `test-plans/` | Risk-based test plans | `/tap-test-plan` → qa-lead | `test-plan.md` |
| `ux/` | UX heuristic reviews, flows, wireframes, design-change specs | `/tap-ask ux`, `/tap-change-ui` → ux-designer | — |
| `ba/` | User stories, acceptance criteria, process flows | `/tap-feature`, `/tap-ask ba` → business-analyst | `user-story.md` |
| `impact/` | Test impact reports (what a change breaks, update plan) | `/tap-sync-tests`, `/tap-change-*` → test-impact-analyst | `impact-report.md` |
| `data/` | Data integrity reports, throwaway data scripts | `/tap-data` → data-tester | — |
| `debug/` | Root-cause analyses of failures and flaky tests | `/tap-debug` → debugger | — |
| `doctor/` | Saved environment/health check results | `/tap-doctor` → env-ops | — |
| `e2e/` | End-to-end journey designs and run summaries | `/tap-e2e` → e2e-architect | — |
| `retros/` | Retrospectives (learnings are also distilled into `tap26/memory/`) | `/tap-retro` → knowledge-curator | `retro.md` |

Hand-off reports use `tap26/templates/handoff.md` and appear in the chat, not here.

## Good to know
- Reports are **evidence, not memory**. Durable lessons go to `tap26/memory/` via
  `node tap26/scripts/memory.mjs …`; framework improvements go to `tap26/evolution/`.
- Don't hand-edit a report another agent is still working on; ask for a new revision instead.
- Reports may contain request/response samples from your local app — never paste real credentials,
  cookies or `.env` values into them.
- `/tap-status` shows the five most recent reports.
