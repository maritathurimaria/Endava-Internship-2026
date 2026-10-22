#!/usr/bin/env node
/**
 * TAP26-Junior performance smoke (zero dependencies, cross-platform, Node >= 18).
 *
 * Logs in as the first seeded user, keeps the `connect.sid` session cookie and fires
 * N requests per endpoint with concurrency C, then prints latency percentiles.
 * Read-only endpoints only — safe to run against the local dev API at any time.
 *
 * Usage:
 *   node tap26/scripts/perf-smoke.mjs                     # N=50, C=5 against http://localhost:3001
 *   node tap26/scripts/perf-smoke.mjs --n 200 --c 10      # more load
 *   node tap26/scripts/perf-smoke.mjs --base http://localhost:3001 --json
 *
 * Env: SEED_DEFAULT_USER_PASSWORD (default "s3cret").
 * Endpoints: GET /transactions, /transactions/public, /transactions/contacts, /notifications, /bankAccounts, /users
 * Exit codes: 0 all requests succeeded · 1 some requests failed (non-2xx / network) · 2 login/setup failed.
 * This is a smoke probe (one machine, dev server), not a load test — compare runs, not absolute numbers.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
  process.exit(0);
}
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const positiveInt = (value, name) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    console.error(`perf-smoke: --${name} must be a positive integer (got "${value}")`);
    process.exit(2);
  }
  return n;
};
const N = positiveInt(flag("n", "50"), "n");
const C = positiveInt(flag("c", "5"), "c");
const BASE = flag("base", "http://localhost:3001").replace(/\/$/, "");
const JSON_OUT = args.includes("--json");
const PASSWORD = process.env.SEED_DEFAULT_USER_PASSWORD || "s3cret";
const ENDPOINTS = ["/transactions", "/transactions/public", "/transactions/contacts", "/notifications", "/bankAccounts", "/users"];

const fail = (message) => {
  console.error(`perf-smoke: ${message}`);
  process.exit(2);
};

// ---- setup -----------------------------------------------------------------------------

const firstUser = async () => {
  const res = await fetch(`${BASE}/testData/users`).catch((e) => fail(`API not reachable at ${BASE} (${e.cause?.code || e.message}) — start it with: yarn dev`));
  if (res.status !== 200) fail(`GET /testData/users → ${res.status} (is NODE_ENV=development? start with: yarn dev)`);
  const { results = [] } = await res.json();
  if (!results.length) fail("no users in the database — reset it: curl -s -X POST http://localhost:3001/testData/seed");
  return results[0];
};

const login = async (username) => {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "LOGIN", username, password: PASSWORD }),
    redirect: "manual",
  });
  const cookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [res.headers.get("set-cookie") || ""];
  const sid = cookies.map((c) => c.split(";")[0]).find((c) => c.startsWith("connect.sid="));
  if (res.status !== 200 || !sid) fail(`login as ${username} failed (status ${res.status}${sid ? "" : ", no connect.sid cookie"}) — check SEED_DEFAULT_USER_PASSWORD`);
  return sid;
};

// ---- load ------------------------------------------------------------------------------

const timed = async (url, cookie) => {
  const started = performance.now();
  try {
    const res = await fetch(url, { headers: { cookie } });
    await res.arrayBuffer();
    return { ms: performance.now() - started, ok: res.status >= 200 && res.status < 300, status: res.status };
  } catch (error) {
    return { ms: performance.now() - started, ok: false, status: error.cause?.code || "ERR" };
  }
};

/** Run `total` requests with at most `concurrency` in flight. */
const runPool = async (total, concurrency, task) => {
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < total) {
      next += 1;
      results.push(await task());
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
  return results;
};

const percentile = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : 0);
const round = (n) => Math.round(n * 10) / 10;

const measure = async (path, cookie) => {
  const started = performance.now();
  const results = await runPool(N, C, () => timed(`${BASE}${path}`, cookie));
  const wall = (performance.now() - started) / 1000;
  const ms = results.map((r) => r.ms).sort((a, b) => a - b);
  const errors = results.filter((r) => !r.ok);
  return {
    endpoint: `GET ${path}`,
    n: results.length,
    p50: round(percentile(ms, 50)),
    p95: round(percentile(ms, 95)),
    max: round(ms[ms.length - 1] || 0),
    errPct: round((errors.length / results.length) * 100),
    rps: round(results.length / wall),
    errorStatuses: [...new Set(errors.map((e) => e.status))],
  };
};

const main = async () => {
  const user = await firstUser();
  const cookie = await login(user.username);
  // one warm-up request per endpoint so ts-node/lowdb cold paths do not skew p95
  await Promise.all(ENDPOINTS.map((p) => timed(`${BASE}${p}`, cookie)));
  const rows = [];
  for (const path of ENDPOINTS) rows.push(await measure(path, cookie)); // sequential per endpoint: clean numbers
  const failed = rows.some((r) => r.errPct > 0);

  if (JSON_OUT) {
    console.log(JSON.stringify({ base: BASE, user: user.username, n: N, concurrency: C, date: new Date().toISOString(), results: rows }, null, 2));
  } else {
    const w = Math.max(...rows.map((r) => r.endpoint.length));
    const cols = ["p50 ms", "p95 ms", "max ms", "err %", "req/s"];
    const fmt = (v) => String(v).padStart(8);
    console.log(
      [
        `Perf smoke — ${BASE} as ${user.username} · ${N} requests/endpoint · concurrency ${C}`,
        "",
        `${"Endpoint".padEnd(w)} ${cols.map(fmt).join("")}`,
        `${"-".repeat(w)} ${cols.map(() => fmt("------")).join("")}`,
        ...rows.map((r) => `${r.endpoint.padEnd(w)} ${[r.p50, r.p95, r.max, r.errPct, r.rps].map(fmt).join("")}${r.errorStatuses.length ? `  (errors: ${r.errorStatuses.join(", ")})` : ""}`),
        "",
        failed ? "Some requests failed — see the err % column." : "All requests succeeded. Compare these numbers between runs, not against other machines.",
      ].join("\n"),
    );
  }
  process.exit(failed ? 1 : 0);
};

main().catch((error) => fail(error.stack || error.message));
