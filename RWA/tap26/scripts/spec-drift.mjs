#!/usr/bin/env node
/**
 * TAP26-Junior OpenAPI ↔ Express drift check (zero dependencies, cross-platform).
 *
 * Compares the paths + methods documented in tap26/openapi/openapi.json with the routes
 * actually registered in backend/ (scanned statically, same parser as scan-app.mjs).
 * OpenAPI `{param}` is compared with Express `:param` by path *shape*, so a renamed
 * parameter is reported as info, not drift.
 *
 * Usage:
 *   node tap26/scripts/spec-drift.mjs                    # human report
 *   node tap26/scripts/spec-drift.mjs --json             # machine-readable
 *   node tap26/scripts/spec-drift.mjs --spec <file.json> # check another spec file
 *
 * Reports: documented-but-missing · implemented-but-undocumented · method mismatches
 *          (+ info: parameter-name differences).
 * Exit codes: 0 in sync · 1 drift found · 2 spec missing/unreadable.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { SCRIPT_ROOT, scanApiRoutes, openapiToExpress, samePathShape, METHODS, byKey } from "./lib/parse.mjs";

const ROOT = SCRIPT_ROOT;
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
  process.exit(0);
}
const specArg = (() => {
  const i = args.indexOf("--spec");
  return i >= 0 ? args[i + 1] : undefined;
})();
const SPEC = specArg ? (isAbsolute(specArg) ? specArg : resolve(process.cwd(), specArg)) : join(ROOT, "tap26", "openapi", "openapi.json");
const JSON_OUT = args.includes("--json");
const shown = (p) => (p.startsWith(ROOT) ? p.slice(ROOT.length + 1).split("\\").join("/") : p);

if (!existsSync(SPEC)) {
  console.error(
    [
      `spec-drift: no OpenAPI spec at ${shown(SPEC)}.`,
      `  The contract lives in tap26/openapi/openapi.yaml (source of truth) and openapi.json (generated).`,
      `  Fix: run /tap-swagger (contract-guardian) to (re)generate it, or point to a file: --spec <path.json>`,
    ].join("\n"),
  );
  process.exit(2);
}
const spec = (() => {
  try {
    return JSON.parse(readFileSync(SPEC, "utf8"));
  } catch (error) {
    console.error(`spec-drift: ${shown(SPEC)} is not valid JSON (${error.message}). Regenerate it from openapi.yaml (/tap-swagger).`);
    process.exit(2);
  }
})();

// ---- compare --------------------------------------------------------------------------

const documented = Object.entries(spec.paths || {}).flatMap(([path, item]) =>
  Object.keys(item || {})
    .filter((k) => METHODS.includes(k))
    .map((m) => ({ method: m.toUpperCase(), specPath: path, path: openapiToExpress(path), operationId: item[m].operationId || "" })),
);
const implemented = scanApiRoutes(ROOT);

const shapes = [...new Set([...documented.map((d) => d.path), ...implemented.map((r) => r.path)])];
// group both sides by path shape (param names ignored)
const groups = shapes.reduce((acc, p) => {
  const existing = acc.find((g) => samePathShape(g.key, p));
  if (existing) return acc;
  return [...acc, { key: p }];
}, []);

const result = groups
  .map(({ key }) => {
    const docs = documented.filter((d) => samePathShape(d.path, key));
    const impl = implemented.filter((r) => samePathShape(r.path, key));
    return { key, docs, impl };
  })
  .reduce(
    (acc, { docs, impl }) => {
      if (!impl.length) return { ...acc, missing: [...acc.missing, ...docs] };
      if (!docs.length) return { ...acc, undocumented: [...acc.undocumented, ...impl] };
      const docMethods = new Set(docs.map((d) => d.method));
      const implMethods = new Set(impl.map((r) => r.method));
      const onlyDocs = docs.filter((d) => !implMethods.has(d.method));
      const onlyImpl = impl.filter((r) => !docMethods.has(r.method));
      const paramDiffs = docs
        .map((d) => ({ d, r: impl.find((r) => r.method === d.method) }))
        .filter(({ r, d }) => r && r.path !== d.path)
        .map(({ d, r }) => ({ method: d.method, specPath: d.specPath, routePath: r.path, file: `${r.file}:${r.line}` }));
      return {
        ...acc,
        mismatches: onlyDocs.length || onlyImpl.length
          ? [
              ...acc.mismatches,
              {
                specPaths: [...new Set(docs.map((d) => d.specPath))],
                routePaths: [...new Set(impl.map((r) => r.path))],
                documentedOnly: onlyDocs.map((d) => d.method).sort(),
                implementedOnly: onlyImpl.map((r) => `${r.method}`).sort(),
                sources: onlyImpl.map((r) => `${r.file}:${r.line}`),
              },
            ]
          : acc.mismatches,
        paramNames: [...acc.paramNames, ...paramDiffs],
        matched: acc.matched + docs.filter((d) => implMethods.has(d.method)).length,
      };
    },
    { missing: [], undocumented: [], mismatches: [], paramNames: [], matched: 0 },
  );

const missing = result.missing.sort(byKey("path", "method"));
const undocumented = result.undocumented.sort(byKey("path", "method"));
const mismatches = result.mismatches.sort(byKey((m) => m.routePaths[0]));
const paramNames = result.paramNames.sort(byKey("specPath", "method"));
const drift = missing.length + undocumented.length + mismatches.length > 0;

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        spec: shown(SPEC),
        inSync: !drift,
        counts: { documented: documented.length, implemented: implemented.length, matched: result.matched, missing: missing.length, undocumented: undocumented.length, methodMismatches: mismatches.length, paramNameDiffs: paramNames.length },
        documentedButMissing: missing.map(({ method, specPath, operationId }) => ({ method, path: specPath, operationId })),
        implementedButUndocumented: undocumented.map((r) => ({ method: r.method, path: r.path, source: `${r.file}:${r.line}` })),
        methodMismatches: mismatches,
        paramNameDiffs: paramNames,
      },
      null,
      2,
    ),
  );
} else {
  const lines = [
    `Spec drift — ${shown(SPEC)} vs backend/ (Express)`,
    `  documented operations: ${documented.length} · implemented routes: ${implemented.length} · matched: ${result.matched}`,
    "",
    `Documented but missing in the API (${missing.length})`,
    ...(missing.length ? missing.map((d) => `  ✘ ${d.method.padEnd(6)} ${d.specPath}${d.operationId ? `  (${d.operationId})` : ""}`) : ["  ✔ none"]),
    "",
    `Implemented but undocumented (${undocumented.length})`,
    ...(undocumented.length ? undocumented.map((r) => `  ✘ ${r.method.padEnd(6)} ${r.path}  ← ${r.file}:${r.line}`) : ["  ✔ none"]),
    "",
    `Method mismatches on the same path (${mismatches.length})`,
    ...(mismatches.length
      ? mismatches.map(
          (m) =>
            `  ✘ ${m.specPaths.join(" | ")}: spec-only [${m.documentedOnly.join(", ") || "-"}] · code-only [${m.implementedOnly.join(", ") || "-"}]${m.sources.length ? `  ← ${m.sources.join(", ")}` : ""}`,
        )
      : ["  ✔ none"]),
    ...(paramNames.length
      ? ["", `Info — parameter names differ (same shape, not drift) (${paramNames.length})`, ...paramNames.map((p) => `  · ${p.method.padEnd(6)} spec ${p.specPath} ↔ code ${p.routePath}  (${p.file})`)]
      : []),
    "",
    drift
      ? "DRIFT FOUND — update tap26/openapi/openapi.yaml (then regenerate openapi.json) or the code; see /tap-swagger."
      : "IN SYNC — every documented operation is implemented and vice versa.",
  ];
  console.log(lines.join("\n"));
}
process.exit(drift ? 1 : 0);
