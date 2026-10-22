<!--
  Performance smoke report — used by /tap-perf (perf-tester). This is a LOCAL SMOKE, not a load test.
  Save as tap26/reports/perf/perf-<YYYYMMDD-HHmm>-<scope>.md (D-007).
  Budgets (local, warm): API p95 ≤ 300 ms reads, ≤ 500 ms writes/login, 0 % errors;
  UI LCP ≤ 2.5 s, CLS ≤ 0.1, TTFB ≤ 800 ms. Regression = > 20 % worse than baseline.
-->
# Performance smoke — {{scope}} ({{YYYY-MM-DD}})

| Field | Value |
|---|---|
| Build | `{{git sha}}` |
| Machine | {{OS, CPU count, RAM}} · Node {{version}} |
| App mode | {{yarn dev (watch) / other}} · other load on machine: {{…}} |
| Baseline | {{previous report path / memory fact / none}} |

## Summary
{{2–3 sentences: PASS/WARN/FAIL counts, slowest item, regression verdict.}}

## API latency
<!-- Warm-up discarded. Percentiles from raw samples. -->
| Endpoint | Samples | Concurrency | p50 ms | p95 ms | max ms | Errors | Size KB | Budget | Result |
|---|---|---|---|---|---|---|---|---|---|
| `GET /transactions` | {{n}} | {{n}} | {{n}} | {{n}} | {{n}} | {{n}} | {{n}} | 300 | {{PASS/WARN/FAIL}} |

Command: `{{node tap26/scripts/perf-smoke.mjs …}}`

## UI timings (median of {{5}} cold loads, 1280×1000)
| Screen | TTFB ms | FCP ms | LCP ms | CLS | Budget | Result |
|---|---|---|---|---|---|---|
| `/signin` | {{n}} | {{n}} | {{n}} | {{n}} | LCP 2500 / CLS 0.1 | {{…}} |

## Comparison with baseline
| Item | Baseline | Now | Δ % | Verdict |
|---|---|---|---|---|
| {{GET /transactions p95}} | {{n}} | {{n}} | {{±n}} | {{ok / regression}} |

## Hotspots & likely causes
- {{item}} — {{cause}} — `{{file:line}}` (e.g. full-collection scans in backend/database.ts, large payloads, re-renders)

## Caveats
- Local dev servers, single machine, small seed (600 transactions): numbers are relative, not production-predictive.

## Recommendations
1. {{…}}
