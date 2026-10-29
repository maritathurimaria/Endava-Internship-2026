# TAP26-Junior — evolution metrics

Evidence for (and against) framework changes. `/tap-retro` and `/tap-evolve apply` add rows; the
knowledge-curator reads this table during `/tap-evolve review`. Keep one row per measurement; never
rewrite past rows — add a new one.

## How to measure
| Metric | How to get it |
|---|---|
| Gates passed / failed | Count of BLUEPRINT §7 gates per orchestrated task (hand-off reports, reviews) |
| Review verdicts | `tap26/reports/reviews/*` — approve vs request-changes |
| Test health | `playwright/test-results/.last-run.json`; passed/failed/flaky counts per run |
| Flake rate | Tests that failed then passed on rerun ÷ tests run |
| Rework loops | Times the orchestrator sent work back to an agent |
| Memory quality | New learnings per retro (target ≤ 3), duplicates found, open questions answered |
| Student friction | Questions logged (`open-questions.md`), lab checkpoints failed (`/tap-lab NN check`) |

## Session / retro metrics
| Date | Scope | Tasks | Gates ✅/❌ | Reviews ✅/✋ | Tests added | Flake rate | Rework loops | Learnings | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-16 | 1.0.0 baseline | — | — | — | 55 API + 59 UI (per viewport) | 0 % | — | L-001…L-006 | Initial release |
| 2026-10-20 | Week through 2026-10-20 | G-01, KI-01 report, G-11, A11Y-02, empty bank state, Bob/Alice E2E, ui-tablet | Typechecks ✅; Bob E2E run ❌ blocked | n/a | 3 focused tests + ui-tablet project | not measured | 1 patch-context correction | none; reused L-008 | G-01 expected failure; bank empty state passed desktop/mobile; tablet last-run passed but reporter count unavailable; Bob E2E unverified; usage counters n/a |
| 2026-10-22 | Weekly follow-up | Review debugger recommendation; refresh EP-001 | Retro ✅; no tests run this follow-up | n/a | 0 | n/a | 0 | none; reused L-008 | `npm.cmd --prefix playwright run test:e2e` remains unverified; journal and usage counters unavailable |

## Evolution outcomes
<!-- One row per applied proposal; revisit after ~3 sessions to fill "Observed effect". -->
| EP | Version | Applied | Success metric (from proposal) | Baseline | Observed effect | Keep / revert |
|---|---|---|---|---|---|---|
| — | 1.0.0 | 2026-10-16 | — | — | — | — |
