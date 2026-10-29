---
name: tap-perf
description: "Performance smoke test of the locally running Real World App: API latency baselines (p50/p95/max, error rate) for key endpoints with the zero-dependency perf-smoke.mjs probe, plus browser timings and Web Vitals (TTFB, FCP, LCP, CLS) for key screens via Playwright, compared against budgets and the previous report. Not a load test. Use when the student asks 'is the API fast enough?', 'did my change make the feed slower?', or 'measure the transaction list performance'."
argument-hint: "[api|ui|all] [endpoint or screen] [compare]   (default: all)"
---

# /tap-perf — performance smoke & report

## Goal
Give the student trustworthy, repeatable numbers for how fast the RWA responds locally, show whether
a change made it slower, and teach how to read p50/p95 and Web Vitals — without pretending a laptop
smoke test is a production load test.

## Inputs
- `$ARGUMENTS`:
  - `api` — endpoints (default set): `GET /checkAuth`, `GET /transactions`, `GET /transactions/public`,
    `GET /transactions/contacts`, `GET /users`, `GET /users/search?q=a`, `GET /notifications`,
    `GET /bankAccounts`, `POST /graphql` (listBankAccount), `POST /login`.
  - `ui` — screens: `/signin`, `/` (public feed, infinite list), `/personal`, `/transaction/new`, `/notifications`.
  - `all` (default); or a single endpoint/screen; add `compare` to diff against the latest report.
- Budgets (local smoke, warm): API p95 ≤ 300 ms for reads, ≤ 500 ms for writes/login, 0 % errors;
  UI LCP ≤ 2.5 s, CLS ≤ 0.1, TTFB ≤ 800 ms. Regression = p95 or LCP worse by > 20 % vs baseline.
- Template: `tap26/templates/perf-report.md`. Output: `tap26/reports/perf/`.

## Steps
1. **Preconditions** (main thread): `node tap26/scripts/doctor.mjs --quick` — UI and API up. Note what
   else is running (dev servers in watch mode skew numbers). Find the latest baseline:
   Glob `tap26/reports/perf/perf-*.md` and `node tap26/scripts/memory.mjs search perf`.
2. **Delegate to `perf-tester`** (Agent tool) with this brief:
   > Run a performance smoke of <scope> on the local RWA. API: use `node tap26/scripts/perf-smoke.mjs`
   > (read its usage header for flags; log in as a seeded user, password `s3cret`, to get the
   > `connect.sid` cookie). Warm up first (discard the first 10 requests), then ≥ 100 requests per
   > endpoint at low concurrency (≤ 5) — never more than 1 000 requests total. Record p50, p95, max,
   > error count, and the response size. UI: write a throwaway Playwright script (from `playwright/`, using
   > `loginByXstate` from `@ui`) that loads each screen 5 times in a fresh context at 1280×1000, reads
   > `performance.getEntriesByType('navigation')`, FCP, LCP and CLS via `PerformanceObserver`, and takes
   > the median. Capture machine context (OS, CPU count, Node version, `git rev-parse --short HEAD`).
   > Compare with the baseline report if present; flag budget breaches and > 20 % regressions. For each
   > slow item, look for the cause in code (e.g. full-table scans in `backend/database.ts`, missing
   > pagination, large payloads, re-renders in `src/components/TransactionInfiniteList.tsx`) and cite
   > `file:line`. Reseed the DB at the end if any write requests were made. Write
   > `tap26/reports/perf/perf-<YYYYMMDD-HHmm>-<scope>.md` from the template. End with the hand-off report.
3. **Sanity check** the numbers: p95 ≥ p50, sample counts present, error rate stated, machine context
   present. Large variance (p95 > 5× p50) → ask for one rerun before concluding.
4. **Next steps**: for a regression, offer `/tap-debug` or `/tap-research` on the hotspot; for a stable
   baseline, suggest recording it (below) and re-running after the next change with `compare`.

## Quality gates
- Clearly labelled as a **local smoke**, with sample size, concurrency and machine context.
- Every number has its unit; percentiles computed from raw samples (not averages of averages).
- Budget breaches and regressions are explicit (PASS/WARN/FAIL per row).
- No change to application code; request volume within the limits above; DB reseeded after writes.

## Output
- `tap26/reports/perf/perf-<YYYYMMDD-HHmm>-<scope>.md` (tables: API latency, UI vitals, comparison, hotspots).
- Chat (≤ 15 lines): PASS/WARN/FAIL counts, slowest 3 items with p95/LCP, regression verdict, next step.

## Memory
- Baseline: `node tap26/scripts/memory.mjs add-fact perf "baseline <date> @<sha>: GET /transactions p95 <n> ms; / LCP <n> ms" --by perf-tester`.
- Cause found: `node tap26/scripts/memory.mjs add-learning "<hotspot>" --lesson "<text>" --tags perf --applies perf-tester,be-dev,fe-dev --by perf-tester`.
- Budget change agreed with the student: `node tap26/scripts/memory.mjs add-decision "Perf budgets" --context "<why>" --decision "<new budgets>" --by perf-tester`.

## Learn more
- `tap26/docs/07-testing-framework.md`, `tap26/docs/13-troubleshooting.md`
- Labs: `tap26/labs/lab-05-*` (API test basics — same login helpers), `tap26/labs/lab-12-*` (e2e journey)
- Web Vitals: https://web.dev/articles/vitals
