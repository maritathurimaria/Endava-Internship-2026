#!/usr/bin/env node
/**
 * TAP26-Junior test impact analysis (zero dependencies, cross-platform).
 *
 * Turns an app change (git diff + the change ledger) into a list of impacted API routes,
 * data-test selectors, state machines and the tests that reference them, ending with
 * "Recommended actions". Static analysis only — it tells you where to look, not what broke.
 *
 * Usage:
 *   node tap26/scripts/impact.mjs                   # working tree (staged + unstaged + untracked) vs HEAD
 *   node tap26/scripts/impact.mjs --staged          # only what is staged (index vs HEAD)
 *   node tap26/scripts/impact.mjs --since <ref>     # <ref> vs working tree, e.g. --since main or --since HEAD~3
 *   node tap26/scripts/impact.mjs --since A..B      # an explicit commit range (A..B or A...B)
 *   node tap26/scripts/impact.mjs --write           # also save tap26/reports/impact/impact-<YYYYMMDD-HHmm>.md
 *   node tap26/scripts/impact.mjs --json            # machine-readable output
 *   node tap26/scripts/impact.mjs --repo <dir>      # analyse another checkout
 *
 * Which repository? The git repository of the current directory when it is an RWA checkout
 * (has backend/app.ts), otherwise the repository this script lives in. So you can run the
 * script from a throwaway clone: `cd /tmp/rwa-copy && node /path/to/tap26/scripts/impact.mjs`.
 *
 * Change ledger: entries in <repo>/tap26/memory/changes.md newer than the last commit are
 * listed and their files are added to the analysis (file-level, no hunks).
 * Exit codes: 0 report produced (even when impact is found) · 2 not a git repo / bad ref.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SCRIPT_ROOT,
  scanApiRoutes,
  scanSelectors,
  scanTests,
  scanMachines,
  scanWindowServices,
  buildApiIndex,
  routeCoverage,
  routeKey,
  parseRouterText,
  parseMounts,
  extractDataTests,
  selectorRefsOf,
  selectorReferenced,
  mentionsSelector,
  enclosingExports,
  TEST_SOURCES,
  HELPER_SOURCES,
  uniqSorted,
  byKey,
} from "./lib/parse.mjs";

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
  process.exit(0);
}
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const die = (message) => {
  console.error(`impact.mjs: ${message}`);
  process.exit(2);
};

// ---- git plumbing -------------------------------------------------------------------------

const git = (cwd, gitArgs, { allowFail = false } = {}) => {
  try {
    return execFileSync("git", gitArgs, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    if (allowFail) return null;
    throw new Error(`git ${gitArgs.join(" ")} failed: ${(error.stderr || error.message).toString().trim()}`);
  }
};

const resolveRepo = () => {
  const explicit = flag("repo");
  const start = explicit ? (isAbsolute(explicit) ? explicit : resolve(process.cwd(), explicit)) : process.cwd();
  const top = git(start, ["rev-parse", "--show-toplevel"], { allowFail: true });
  const candidate = top ? resolve(top.trim()) : null;
  if (candidate && existsSync(join(candidate, "backend", "app.ts"))) return candidate;
  if (explicit) die(`${start} is not an RWA git checkout`);
  const fallback = git(SCRIPT_ROOT, ["rev-parse", "--show-toplevel"], { allowFail: true });
  if (!fallback) die("no git repository found (run inside the RWA repo or pass --repo <dir>)");
  return resolve(fallback.trim());
};

const REPO = resolveRepo();
const SINCE = flag("since");
const STAGED = args.includes("--staged");
if (SINCE && STAGED) die("use either --since or --staged, not both");

/** Diff mode → git args, and readers for the old/new version of a file. */
const mode = (() => {
  if (SINCE && /\.\.\.?/.test(SINCE)) {
    const [a, b] = SINCE.split(/\.\.\.?/);
    const base = SINCE.includes("...") ? git(REPO, ["merge-base", a || "HEAD", b || "HEAD"]).trim() : a || "HEAD";
    return { label: `range ${SINCE}`, diffArgs: [SINCE], oldRef: base, newRef: b || "HEAD", untracked: false };
  }
  if (SINCE) return { label: `${SINCE} → working tree`, diffArgs: [SINCE], oldRef: SINCE, newRef: null, untracked: true };
  if (STAGED) return { label: "staged (index) vs HEAD", diffArgs: ["--cached"], oldRef: "HEAD", newRef: ":", untracked: false };
  return { label: "working tree vs HEAD", diffArgs: ["HEAD"], oldRef: "HEAD", newRef: null, untracked: true };
})();

if (git(REPO, ["rev-parse", "--verify", "--quiet", `${mode.oldRef}^{commit}`], { allowFail: true }) === null)
  die(`unknown git ref "${mode.oldRef}" in ${REPO}`);

const showAt = (ref, file) => {
  if (ref === ":") return git(REPO, ["show", `:${file}`], { allowFail: true }) ?? "";
  return git(REPO, ["show", `${ref}:${file}`], { allowFail: true }) ?? "";
};
const oldText = (file) => showAt(mode.oldRef, file);
const newText = (file) =>
  mode.newRef ? showAt(mode.newRef, file) : existsSync(join(REPO, file)) ? readFileSync(join(REPO, file), "utf8") : "";

// ---- collect changes ------------------------------------------------------------------------

const nameStatus = git(REPO, ["diff", "--no-renames", "--name-status", ...mode.diffArgs])
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [status, file] = line.split("\t");
    return { file, status: status[0] };
  });

const untracked = mode.untracked
  ? git(REPO, ["ls-files", "--others", "--exclude-standard"])
      .split("\n")
      .filter(Boolean)
      .map((file) => ({ file, status: "A", untracked: true }))
  : [];

/** Parse `git diff -U0` into { file → [{ oldStart, oldLen, newStart, newLen, minus[], plus[] }] }. */
const parseHunks = (diff) => {
  const files = {};
  let current = null;
  let hunk = null;
  diff.split("\n").forEach((line) => {
    if (line.startsWith("diff --git ")) {
      current = null;
      hunk = null;
    } else if (line.startsWith("+++ ")) {
      const name = line.slice(4).replace(/^b\//, "");
      if (name !== "/dev/null") current = name;
    } else if (line.startsWith("--- ")) {
      const name = line.slice(4).replace(/^a\//, "");
      if (name !== "/dev/null") current = name;
    } else if (line.startsWith("@@") && current) {
      const m = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      hunk = { oldStart: +m[1], oldLen: m[2] === undefined ? 1 : +m[2], newStart: +m[3], newLen: m[4] === undefined ? 1 : +m[4], minus: [], plus: [] };
      (files[current] = files[current] || []).push(hunk);
    } else if (hunk && line.startsWith("-")) hunk.minus.push(line.slice(1));
    else if (hunk && line.startsWith("+")) hunk.plus.push(line.slice(1));
  });
  return files;
};

const hunks = parseHunks(git(REPO, ["diff", "--no-renames", "-U0", ...mode.diffArgs]));
untracked.forEach(({ file }) => {
  const text = newText(file);
  if (!/\0/.test(text.slice(0, 2000))) hunks[file] = [{ oldStart: 0, oldLen: 0, newStart: 1, newLen: text.split("\n").length, minus: [], plus: text.split("\n") }];
});

/** Ledger entries newer than the last commit (hook writes local time "YYYY-MM-DD HH:MM"). */
const ledger = (() => {
  const file = join(REPO, "tap26", "memory", "changes.md");
  if (!existsSync(file)) return [];
  const lastCommit = Number((git(REPO, ["log", "-1", "--format=%ct"], { allowFail: true }) || "0").trim()) * 1000;
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.match(/^- (\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}) \| ([^|]+?) \| ([^|]*?) \| (.*)$/))
    .filter(Boolean)
    .map((m) => ({ when: new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]), stamp: `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`, file: m[6].trim(), what: m[7].trim(), by: m[8].trim() }))
    .filter((e) => e.when.getTime() >= lastCommit - 60000);
})();

const changedMap = new Map();
[...nameStatus, ...untracked].forEach((c) => changedMap.set(c.file, { ...c, source: c.untracked ? "untracked" : "diff" }));
ledger.forEach((e) => {
  if (!changedMap.has(e.file) && existsSync(join(REPO, e.file))) changedMap.set(e.file, { file: e.file, status: "M", source: "ledger" });
});
const changed = [...changedMap.values()].sort(byKey("file"));

// ---- classify ---------------------------------------------------------------------------------

const CLASSES = [
  ["backend-route", /^backend\/([\w-]+-routes|auth|app)\.ts$/],
  ["backend-validator", /^backend\/validators\.ts$/],
  ["backend-helper", /^backend\/helpers\.ts$/],
  ["backend-db", /^backend\/database\.ts$/],
  ["backend-graphql", /^backend\/graphql\//],
  ["backend-other", /^backend\//],
  ["seed", /^data\/.*seed.*\.json$|^scripts\/.*[sS]eed/],
  ["runtime-db", /^data\/database\.json$/],
  ["frontend-test", /\.cy\.tsx?$|^src\/__tests__\//],
  ["frontend-machine", /^src\/machines\//],
  ["frontend-container", /^src\/containers\//],
  ["frontend-component", /^src\/components\//],
  ["frontend-model", /^src\/models\//],
  ["frontend-other", /^src\//],
  ["openapi", /^tap26\/openapi\//],
  ["tests-playwright", /^playwright\/tests\//],
  ["test-framework", /^playwright\//],
  ["tests-cypress", /^cypress\//],
  ["tap26-framework", /^(tap26|\.claude|\.vscode)\//],
  ["other", /./],
];
const classify = (file) => CLASSES.find(([, re]) => re.test(file))[0];

// ---- current app model (from the repo's working tree) -------------------------------------

const routes = scanApiRoutes(REPO);
const selectors = scanSelectors(REPO);
const tests = scanTests(REPO, TEST_SOURCES);
const helpers = scanTests(REPO, HELPER_SOURCES);
const machines = scanMachines(REPO);
const services = scanWindowServices(REPO);
const apiIndex = buildApiIndex(REPO);
const mounts = parseMounts(readFileSync(join(REPO, "backend", "app.ts"), "utf8"));
const prefixOf = (file) => (file === "backend/app.ts" ? "" : (mounts.find((m) => m.file === file) || { prefix: null }).prefix);

const touchedNewLines = (file) =>
  (hunks[file] || []).flatMap((h) => (h.newLen ? Array.from({ length: h.newLen }, (_, i) => h.newStart + i) : [Math.max(1, h.newStart)]));
const touchedOldLines = (file) => (hunks[file] || []).flatMap((h) => (h.oldLen ? Array.from({ length: h.oldLen }, (_, i) => h.oldStart + i) : []));
const isTestFile = (f) => /^(playwright\/tests|cypress\/tests)\//.test(f) || /\.cy\.tsx?$/.test(f);

// ---- backend impact ---------------------------------------------------------------------------

const impactedRoutes = new Map(); // key → { route, reasons:Set, change }
const addRoute = (route, reason, change = "affected") => {
  const key = routeKey(route);
  const entry = impactedRoutes.get(key) || { route, reasons: new Set(), change };
  entry.reasons.add(reason);
  if (change !== "affected") entry.change = change;
  impactedRoutes.set(key, entry);
};
const removedRoutes = [];
const notes = [];

const analyseRouteFile = (c) => {
  const prefix = prefixOf(c.file);
  if (prefix === null) {
    notes.push(`${c.file}: router file is not mounted in backend/app.ts (new router? mount it with app.use)`);
  }
  const p = prefix || "";
  const now = c.status === "D" ? [] : parseRouterText(newText(c.file), c.file, p);
  const before = c.status === "A" ? [] : parseRouterText(oldText(c.file), c.file, p);
  const nowKeys = new Set(now.map(routeKey));
  const beforeKeys = new Set(before.map(routeKey));
  before.filter((r) => !nowKeys.has(routeKey(r))).forEach((r) => {
    removedRoutes.push(r);
    addRoute(r, `removed from ${c.file}`, "removed");
  });
  now.filter((r) => !beforeKeys.has(routeKey(r))).forEach((r) => addRoute(r, `added in ${c.file}:${r.line}`, "added"));
  if (c.source === "ledger" || !hunks[c.file]) {
    now.forEach((r) => addRoute(r, `${c.file} edited (ledger, no diff hunks)`, "possibly"));
    return;
  }
  const lines = new Set(touchedNewLines(c.file));
  const hit = now.filter((r) => beforeKeys.has(routeKey(r)) && [...lines].some((l) => l >= r.line && l <= r.endLine));
  hit.forEach((r) => addRoute(r, `handler/middleware edited (${c.file}:${r.line}-${r.endLine})`, "modified"));
  const anyRouteChange = hit.length || now.some((r) => !beforeKeys.has(routeKey(r))) || before.some((r) => !nowKeys.has(routeKey(r)));
  if (!anyRouteChange && c.file !== "backend/app.ts")
    now.forEach((r) => addRoute(r, `${c.file} changed outside route handlers (imports/helpers)`, "possibly"));
  if (c.file === "backend/app.ts") {
    const oldMounts = parseMounts(oldText(c.file)).map((m) => `${m.prefix}→${m.file}`);
    const newMounts = mounts.map((m) => `${m.prefix}→${m.file}`);
    const diffMounts = [...oldMounts.filter((m) => !newMounts.includes(m)), ...newMounts.filter((m) => !oldMounts.includes(m))];
    if (diffMounts.length) {
      notes.push(`backend/app.ts mounts changed: ${diffMounts.join(", ")}`);
      routes.filter((r) => diffMounts.some((m) => m.endsWith(`→${r.file}`))).forEach((r) => addRoute(r, "mount prefix changed in backend/app.ts", "modified"));
    } else if (!hit.length) notes.push("backend/app.ts changed (middleware/config) — every route may be affected; run the full API project");
  }
};

/** Names of exported consts/functions whose bodies the diff touched (old and new versions). */
const touchedSymbols = (c) => {
  const inNew = c.status === "D" ? () => null : enclosingExports(newText(c.file));
  const inOld = c.status === "A" ? () => null : enclosingExports(oldText(c.file));
  return uniqSorted([...touchedNewLines(c.file).map(inNew), ...touchedOldLines(c.file).map(inOld)].filter(Boolean));
};

const analyseBackend = (c, kind) => {
  if (kind === "backend-route") return analyseRouteFile(c);
  if (kind === "backend-validator") {
    const names = touchedSymbols(c);
    notes.push(`validators touched: ${names.join(", ") || "(file-level)"}`);
    routes.filter((r) => r.validators.some((v) => names.includes(v))).forEach((r) => addRoute(r, `uses validator ${r.validators.filter((v) => names.includes(v)).join(", ")}`));
    return;
  }
  if (kind === "backend-helper") {
    const names = touchedSymbols(c);
    notes.push(`helpers touched: ${names.join(", ") || "(file-level)"}`);
    routes.filter((r) => r.middleware.some((m) => names.includes(m))).forEach((r) => addRoute(r, `uses middleware ${r.middleware.filter((m) => names.includes(m)).join(", ")}`));
    return;
  }
  if (kind === "backend-db") {
    const names = touchedSymbols(c).filter((n) => !/^(db|adapter|databaseFile|testSeed)$/.test(n));
    notes.push(`database.ts functions touched: ${names.join(", ") || "(file-level)"}`);
    routes.filter((r) => names.some((n) => new RegExp(`\\b${n}\\b`).test(r.body))).forEach((r) =>
      addRoute(r, `handler calls ${names.filter((n) => new RegExp(`\\b${n}\\b`).test(r.body)).join(", ")}`),
    );
    const resolvers = [...new Set(names.filter((n) => ["backend/graphql/resolvers/Query.ts", "backend/graphql/resolvers/Mutation.ts"].some((f) => existsSync(join(REPO, f)) && new RegExp(`\\b${n}\\b`).test(readFileSync(join(REPO, f), "utf8")))))];
    if (resolvers.length) routes.filter((r) => r.path === "/graphql").forEach((r) => addRoute(r, `GraphQL resolvers call ${resolvers.join(", ")}`));
    return;
  }
  if (kind === "backend-graphql") routes.filter((r) => r.path === "/graphql").forEach((r) => addRoute(r, `${c.file} changed`, "modified"));
  if (kind === "backend-other") notes.push(`${c.file} changed — check which routes import it`);
};

// ---- frontend impact --------------------------------------------------------------------------

const selectorChanges = []; // { file, value, change: added|removed|renamed, to?, stillDeclared[] }

const analyseSelectors = (c) => {
  const minusText = c.status === "D" ? oldText(c.file) : (hunks[c.file] || []).flatMap((h) => h.minus).join("\n");
  const plusText = c.status === "D" ? "" : (hunks[c.file] || []).flatMap((h) => h.plus).join("\n");
  const removedVals = uniqSorted(extractDataTests(minusText).map((s) => s.value));
  const addedVals = uniqSorted(extractDataTests(plusText).map((s) => s.value));
  const removed = removedVals.filter((v) => !addedVals.includes(v));
  const added = addedVals.filter((v) => !removedVals.includes(v));
  const pairs = removed.length === added.length && removed.length > 0 && removed.length <= 3;
  removed.forEach((value, i) =>
    selectorChanges.push({
      file: c.file,
      value,
      change: pairs ? "renamed" : "removed",
      to: pairs ? added[i] : undefined,
      stillDeclared: selectors.filter((s) => s.value === value).map((s) => `${s.file}:${s.line}`),
    }),
  );
  added.forEach((value, i) => !pairs && selectorChanges.push({ file: c.file, value, change: "added", stillDeclared: [] }));
  if (pairs) added.forEach((value) => selectorChanges.push({ file: c.file, value, change: "added (rename target)", stillDeclared: [] }));
};

const machineImpacts = []; // { machine, services[], components[], reason }
const analyseMachine = (c) => {
  const name = c.file.replace(/^src\/machines\//, "").replace(/\.tsx?$/, "");
  const affected = name === "dataMachine" ? [name, ...machines.filter((m) => m.extendsDataMachine).map((m) => m.name)] : [name];
  const svc = uniqSorted([
    ...services.filter((s) => s.machines.some((m) => affected.includes(m))).map((s) => s.service),
    ...machines.filter((m) => affected.includes(m.name)).flatMap((m) => m.services),
  ]);
  const importers = uniqSorted(
    selectors
      .map((s) => s.file)
      .filter((f) => affected.some((m) => new RegExp(`machines/${m}["']`).test(readFileSync(join(REPO, f), "utf8")))),
  );
  machineImpacts.push({ machine: name, affected, services: svc, components: importers });
};

// ---- run analysis -----------------------------------------------------------------------------

const classified = changed.map((c) => ({ ...c, kind: classify(c.file) }));
classified.forEach((c) => {
  if (c.kind.startsWith("backend-")) analyseBackend(c, c.kind);
  if (["frontend-component", "frontend-container", "frontend-other"].includes(c.kind)) analyseSelectors(c);
  if (c.kind === "frontend-machine") {
    analyseSelectors(c);
    analyseMachine(c);
  }
});

// references: tests + helpers against current routes ∪ removed routes
const allRoutes = [...routes, ...removedRoutes.filter((r) => !routes.some((x) => routeKey(x) === routeKey(r)))];
const testCov = routeCoverage(allRoutes, tests, apiIndex);
const helperCov = routeCoverage(allRoutes, helpers, apiIndex);
const refsByFile = [...tests, ...helpers].map((t) => ({ file: t.file, text: t.text, refs: selectorRefsOf(t.text), isTest: isTestFile(t.file) }));

const routeImpact = [...impactedRoutes.values()]
  .map(({ route, reasons, change }) => {
    const k = routeKey(route);
    return {
      method: route.method,
      path: route.path,
      source: `${route.file}:${route.line}`,
      change,
      reasons: [...reasons].sort(),
      tests: uniqSorted([...testCov.get(k).exact, ...testCov.get(k).path]),
      helpers: uniqSorted([...helperCov.get(k).exact, ...helperCov.get(k).path]),
    };
  })
  .sort(byKey("path", "method"));

const selectorImpact = selectorChanges
  .map((s) => {
    const probe = { value: s.value, dynamic: s.value.includes("{"), prefix: s.value.split("{")[0] };
    // new selectors: only exact/pattern references count (a fragment match would be a false positive)
    const strong = (how) => how === "exact" || how === "pattern";
    const hits = refsByFile.filter((r) =>
      s.change.startsWith("added") ? strong(selectorReferenced(probe, r.refs)) : selectorReferenced(probe, r.refs) || mentionsSelector(r.text, s.value),
    );
    return { ...s, tests: hits.filter((h) => h.isTest).map((h) => h.file), helpers: hits.filter((h) => !h.isTest).map((h) => h.file) };
  })
  .sort(byKey("file", "change", "value"));

// tests touching any selector of a changed UI file (re-run candidates)
const componentImpact = classified
  .filter((c) => ["frontend-component", "frontend-container"].includes(c.kind) && c.status !== "D")
  .map((c) => {
    const own = selectors.filter((s) => s.file === c.file);
    const hits = refsByFile.filter((r) => own.some((s) => selectorReferenced(s, r.refs)));
    return { file: c.file, selectors: own.length, tests: hits.filter((h) => h.isTest).map((h) => h.file), helpers: hits.filter((h) => !h.isTest).map((h) => h.file) };
  });

const machineReport = machineImpacts.map((m) => {
  const viaService = tests.filter((t) => m.services.some((s) => t.text.includes(s))).map((t) => t.file);
  const viaHelpers = helpers.filter((t) => m.services.some((s) => t.text.includes(s))).map((t) => t.file);
  const viaComponents = refsByFile.filter((r) => r.isTest && selectors.filter((s) => m.components.includes(s.file)).some((s) => selectorReferenced(s, r.refs))).map((r) => r.file);
  return { ...m, tests: uniqSorted(viaService), helpers: uniqSorted(viaHelpers), componentTests: uniqSorted(viaComponents.filter((f) => !viaService.includes(f))) };
});

const contractTests = tests.filter((t) => /contract|openapi|schema/i.test(t.file) || /openapi\.(json|yaml)/.test(t.text)).map((t) => t.file);
const openapiChanged = classified.some((c) => c.kind === "openapi");
const changedTests = classified.filter((c) => ["tests-playwright", "tests-cypress", "frontend-test"].includes(c.kind));
const frameworkChanged = classified.filter((c) => c.kind === "test-framework");
const seedChanged = classified.some((c) => c.kind === "seed");

// ---- recommendations ------------------------------------------------------------------------

const pwSpecs = (files) => uniqSorted(files.filter((f) => f.startsWith("playwright/tests/")).map((f) => f.replace(/^playwright\//, "")));
const cySpecs = (files) => uniqSorted(files.filter((f) => f.startsWith("cypress/tests/")));
const allImpactedTests = uniqSorted([
  ...routeImpact.flatMap((r) => r.tests),
  ...selectorImpact.flatMap((s) => s.tests),
  ...componentImpact.flatMap((c) => c.tests),
  ...machineReport.flatMap((m) => [...m.tests, ...m.componentTests]),
  ...changedTests.map((c) => c.file).filter((f) => existsSync(join(REPO, f))),
]);

const actions = [];
const brokenSelectors = selectorImpact.filter((s) => (s.change === "removed" || s.change === "renamed") && !s.stillDeclared.length && (s.tests.length || s.helpers.length));
if (brokenSelectors.length)
  actions.push(
    `**Fix selector references (likely failures):** ${brokenSelectors
      .map((s) => `\`${s.value}\`${s.to ? ` → \`${s.to}\`` : ""} in ${[...s.tests, ...s.helpers].join(", ")}`)
      .join("; ")} — run \`/tap-sync-tests\` (ui-automation).`,
  );
const shadowed = selectorImpact.filter((s) => (s.change === "removed" || s.change === "renamed") && s.stillDeclared.length && s.tests.length);
if (shadowed.length)
  actions.push(
    `**Review partially removed selectors:** ${shadowed
      .map((s) => `\`${s.value}\`${s.to ? ` → \`${s.to}\`` : ""} left ${s.file} but is still declared in ${s.stillDeclared.join(", ")}`)
      .join("; ")} — tests that target the instance in the changed file will no longer find it (${uniqSorted(shadowed.flatMap((s) => s.tests)).join(", ")}).`,
  );
const backendTouched = routeImpact.length || classified.some((c) => c.kind.startsWith("backend-"));
if (backendTouched) {
  actions.push("**Contract:** update `tap26/openapi/openapi.yaml` (regenerate openapi.json) for any route/param/response change, then `node tap26/scripts/spec-drift.mjs` must be clean.");
  const untested = routeImpact.filter((r) => !r.tests.length && r.change !== "removed");
  if (untested.length) actions.push(`**Add API tests** for impacted routes with no spec reference: ${untested.map((r) => `\`${r.method} ${r.path}\``).join(", ")} (api-automation).`);
  const removedTested = routeImpact.filter((r) => r.change === "removed" && r.tests.length);
  if (removedTested.length) actions.push(`**Update/remove tests of removed routes:** ${removedTested.map((r) => `\`${r.method} ${r.path}\` (${r.tests.join(", ")})`).join("; ")}.`);
}
if (machineReport.length) actions.push(`**State machine changed:** check tests that drive ${uniqSorted(machineReport.flatMap((m) => m.services)).map((s) => `\`window.${s}\``).join(", ") || "the affected components"} and re-run the UI project on desktop + mobile.`);
if (openapiChanged) actions.push(`**OpenAPI changed:** run \`node tap26/scripts/spec-drift.mjs\`${contractTests.length ? `, contract tests (${contractTests.join(", ")})` : ""} and restart the mock server (\`node tap26/scripts/mock-server.mjs\`) so scenarios use the new spec.`);
if (seedChanged) actions.push("**Seed changed:** many expectations depend on seed counts — reseed (`curl -s -X POST http://localhost:3001/testData/seed`) and run the full Playwright suite.");
if (frameworkChanged.length) actions.push(`**Test framework changed** (${frameworkChanged.map((c) => c.file).join(", ")}): \`npm --prefix playwright run typecheck\` and run the affected project(s).`);
if (changedTests.length) actions.push(`**Changed specs:** run them twice (flake check): ${changedTests.map((c) => `\`${c.file}\``).join(", ")}.`);
const pw = pwSpecs(allImpactedTests);
if (pw.length) actions.push(`**Run impacted Playwright specs:** \`cd playwright && npx playwright test ${pw.join(" ")}\` (re-seeds the DB).`);
const cy = cySpecs(allImpactedTests);
if (cy.length) actions.push(`**Cypress reference specs** (compare only; not the main suite): ${cy.length} file(s) — ${cy.join(", ")}.`);
if (classified.some((c) => c.kind.startsWith("frontend-") || c.kind.startsWith("backend-"))) actions.push("**Refresh generated knowledge:** `node tap26/scripts/scan-app.mjs`; record intent with `node tap26/scripts/memory.mjs log-change <file> <summary>`.");
if (!actions.length) actions.push("No app code changes detected — nothing to re-test. (Framework/docs-only changes.)");

// ---- render -----------------------------------------------------------------------------------

const stampNow = new Date();
const pad = (n) => String(n).padStart(2, "0");
const fileStamp = `${stampNow.getFullYear()}${pad(stampNow.getMonth() + 1)}${pad(stampNow.getDate())}-${pad(stampNow.getHours())}${pad(stampNow.getMinutes())}`;
const kindCounts = classified.reduce((acc, c) => ({ ...acc, [c.kind]: (acc[c.kind] || 0) + 1 }), {});

const report = {
  repo: REPO,
  mode: mode.label,
  generated: stampNow.toISOString(),
  changedFiles: classified.map(({ file, status, kind, source }) => ({ file, status, kind, source })),
  ledger: ledger.map(({ stamp, file, what, by }) => ({ stamp, file, what, by })),
  routes: routeImpact,
  selectors: selectorImpact.map(({ file, value, change, to, stillDeclared, tests: t, helpers: h }) => ({ file, value, change, to, stillDeclared, tests: t, helpers: h })),
  components: componentImpact,
  machines: machineReport,
  contractTests: openapiChanged ? contractTests : [],
  notes,
  impactedTests: allImpactedTests,
  actions,
};

const md = () => {
  const list = (xs, none = "—") => (xs.length ? xs.map((x) => `\`${x}\``).join(", ") : none);
  const appFiles = classified.filter((c) => !["tap26-framework", "other"].includes(c.kind));
  const otherFiles = classified.filter((c) => ["tap26-framework", "other"].includes(c.kind));
  return [
    `# Test impact report`,
    ``,
    `> Generated by impact.mjs on ${stampNow.toISOString().slice(0, 16).replace("T", " ")} UTC · repo \`${REPO}\` · diff: **${mode.label}**`,
    `> Static analysis: references are string matches — verify by running the recommended specs.`,
    ``,
    `## Summary`,
    ``,
    `- Changed files: **${classified.length}** (${Object.entries(kindCounts).sort().map(([k, n]) => `${k} ${n}`).join(", ") || "none"})`,
    `- Impacted API routes: **${routeImpact.length}** · selector changes: **${selectorImpact.length}** · machines: **${machineReport.length}**`,
    `- Tests to run/review: **${allImpactedTests.length}** (${pw.length} Playwright, ${cy.length} Cypress)`,
    ``,
    `## Changed files`,
    ``,
    ...(appFiles.length
      ? ["| Status | File | Class | Source |", "|---|---|---|---|", ...appFiles.map((c) => `| ${c.status} | \`${c.file}\` | ${c.kind} | ${c.source} |`)]
      : ["- no application/test files changed"]),
    ...(otherFiles.length ? [``, `Plus ${otherFiles.length} framework/other file(s) (tap26/, .claude/, …) — not analysed for test impact.`] : []),
    ``,
    ...(ledger.length ? [`## Change ledger (since last commit)`, ``, ...ledger.map((e) => `- ${e.stamp} · \`${e.file}\` · ${e.what} · ${e.by}`), ``] : []),
    `## Impacted API routes`,
    ``,
    ...(routeImpact.length
      ? [
          "| Change | Route | Source | Why | Tests referencing it |",
          "|---|---|---|---|---|",
          ...routeImpact.map((r) => `| ${r.change} | **${r.method}** \`${r.path}\` | ${r.source} | ${r.reasons.join("; ")} | ${list(r.tests, "**none**")} |`),
        ]
      : ["- none"]),
    ``,
    `## data-test selector changes`,
    ``,
    ...(selectorImpact.length
      ? [
          "| Change | Selector | File | Still declared elsewhere | Tests / helpers referencing it |",
          "|---|---|---|---|---|",
          ...selectorImpact.map(
            (s) =>
              `| ${s.change}${s.to ? ` → \`${s.to}\`` : ""} | \`${s.value}\` | ${s.file} | ${s.stillDeclared.join(", ") || "no"} | ${list([...s.tests, ...s.helpers], s.change.startsWith("added") ? "— (new: consider a test)" : "none")} |`,
          ),
        ]
      : ["- none"]),
    ``,
    ...(componentImpact.length
      ? [
          `## Changed UI files → tests using their selectors (re-run)`,
          ``,
          ...componentImpact.map((c) => `- \`${c.file}\` (${c.selectors} selectors): ${list(c.tests, "no spec references")}${c.helpers.length ? ` · helpers ${list(c.helpers)}` : ""}`),
          ``,
        ]
      : []),
    ...(machineReport.length
      ? [
          `## State machines`,
          ``,
          ...machineReport.map(
            (m) =>
              `- \`${m.machine}\`${m.affected.length > 1 ? ` (also ${m.affected.slice(1).join(", ")})` : ""} → services ${list(m.services.map((s) => `window.${s}`), "none on window")}; ` +
              `tests using the services: ${list(m.tests)}${m.helpers.length ? ` (helpers ${list(m.helpers)})` : ""}; tests on components using it: ${list(m.componentTests)}`,
          ),
          ``,
        ]
      : []),
    ...(openapiChanged ? [`## Contract`, ``, `- OpenAPI changed. Contract tests: ${list(contractTests, "none found (consider adding one)")}`, ``] : []),
    ...(notes.length ? [`## Notes`, ``, ...notes.map((n) => `- ${n}`), ``] : []),
    `## Recommended actions`,
    ``,
    ...actions.map((a, i) => `${i + 1}. ${a}`),
    ``,
  ].join("\n");
};

const markdown = md();
if (args.includes("--write")) {
  const dir = join(REPO, "tap26", "reports", "impact");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `impact-${fileStamp}.md`);
  writeFileSync(out, markdown);
  console.error(`impact.mjs: report written to ${out}`);
}
console.log(args.includes("--json") ? JSON.stringify(report, null, 2) : markdown);
