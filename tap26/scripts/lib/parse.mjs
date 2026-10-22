/**
 * TAP26-Junior shared parsers (zero dependencies, cross-platform, Node >= 18).
 *
 * Regex-level static analysis of the Real World App, shared by scan-app.mjs, impact.mjs
 * and spec-drift.mjs. Every function is pure (text in, data out) or takes an explicit
 * repository `root`, so the same code can analyse a throwaway clone.
 *
 *   scanApiRoutes(root)          Express routes: METHOD, full path, file:line, middleware hints
 *   scanUiRoutes(root)           react-router <Route path> in src/containers
 *   scanSelectors(root)          data-test values in src/** (literal + template patterns)
 *   scanTests(root)              Playwright + Cypress specs with describe/test titles
 *   scanMachines(root)           XState machine ids, states, events
 *   scanWindowServices(root)     window.<x>Service exposure → machine files
 *   buildApiIndex(root)          endpoints.ts keys + playwright/src/api function → METHOD path
 *   apiRefsOf(text, apiIndex)    API path references found in a test/helper file
 *   matchRoutes(routes, ref)     which routes an API reference hits (most specific wins)
 *   selectorRefsOf(text)         data-test tokens referenced by a test file
 *   selectorReferenced(sel, r)   does a selector get referenced by those tokens?
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve, relative, basename, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** Repository root of the script itself (tap26/scripts/lib → repo). */
export const SCRIPT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const METHODS = ["get", "post", "put", "patch", "delete"];

// ---- generic helpers -------------------------------------------------------------------

export const toPosix = (p) => p.split(sep).join("/");
export const rel = (root, abs) => toPosix(relative(root, abs));
export const readText = (root, file) => {
  const abs = join(root, file);
  return existsSync(abs) ? readFileSync(abs, "utf8") : "";
};
export const byKey = (...keys) => (a, b) => {
  for (const k of keys) {
    const x = typeof k === "function" ? k(a) : a[k];
    const y = typeof k === "function" ? k(b) : b[k];
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
};
export const uniq = (xs) => [...new Set(xs)];
export const uniqSorted = (xs) => uniq(xs).sort();

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", "test-results", "playwright-report"]);

/** Recursively list files under `dir` (relative to root, posix, sorted) that pass `keep`. */
export const walk = (root, dir, keep = () => true) => {
  const start = join(root, dir);
  if (!existsSync(start)) return [];
  const visit = (abs) =>
    readdirSync(abs, { withFileTypes: true })
      .filter((d) => !SKIP_DIRS.has(d.name))
      .flatMap((d) => {
        const child = join(abs, d.name);
        if (d.isDirectory()) return visit(child);
        return d.isFile() ? [rel(root, child)] : [];
      });
  return visit(start).filter(keep).sort();
};

/** 1-based line number of a character index. */
export const lineAt = (text, index) => {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i += 1) if (text.charCodeAt(i) === 10) line += 1;
  return line;
};

/** Precomputed line lookup (fast for many matches in one file). */
export const lineIndex = (text) => {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return (index) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
};

/** Given index of an opening bracket, return index of its matching closer (string-aware, naive). */
export const matchBracket = (text, openIndex) => {
  const open = text[openIndex];
  const close = { "(": ")", "{": "}", "[": "]" }[open];
  let depth = 0;
  let quote = null;
  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return text.length - 1;
};

// ---- API paths -------------------------------------------------------------------------

/** Normalise an Express path: collapse slashes, drop trailing slash (except root). */
export const normalizePath = (p) => {
  const clean = `/${p}`.replace(/\/+/g, "/");
  return clean.length > 1 ? clean.replace(/\/$/, "") : clean;
};

export const joinPath = (prefix, path) => normalizePath(`${prefix || ""}/${path || ""}`);

/** OpenAPI `{param}` → Express `:param`. */
export const openapiToExpress = (p) => normalizePath(p.replace(/\{([^}]+)\}/g, ":$1"));

/** Express `:param` → OpenAPI `{param}`. */
export const expressToOpenapi = (p) => p.replace(/:(\w+)/g, "{$1}");

const segments = (p) => normalizePath(p).split("/").filter(Boolean);
const isParam = (s) => s.startsWith(":") || s.startsWith("{");

/**
 * Does a concrete-ish reference path (e.g. `/transactions/:p`, `/users/abc`) hit a route pattern?
 * Returns a specificity score (number of literal segment matches) or -1 when it does not match.
 */
export const pathScore = (routePath, refPath) => {
  const r = segments(routePath);
  const x = segments(refPath);
  if (r.length !== x.length) return -1;
  let score = 0;
  for (let i = 0; i < r.length; i += 1) {
    if (isParam(r[i])) continue; // route param matches anything
    if (isParam(x[i]) || r[i] !== x[i]) return -1; // a placeholder never matches a literal
    score += 1;
  }
  return score;
};

/** Same-shape comparison ignoring param names (`/a/:id` ≡ `/a/{x}`). */
export const samePathShape = (a, b) => {
  const x = segments(a);
  const y = segments(b);
  return x.length === y.length && x.every((s, i) => (isParam(s) && isParam(y[i])) || s === y[i]);
};

// ---- Express routes ------------------------------------------------------------------

/** `app.use("/prefix", routerVar)` and `app.use(routerVar)` mounts + their import files. */
export const parseMounts = (appText) => {
  const imports = Object.fromEntries(
    [...appText.matchAll(/import\s+(\w+)\s+from\s+["']\.\/([\w-]+)["']/g)].map((m) => [m[1], `backend/${m[2]}.ts`]),
  );
  const mounts = [...appText.matchAll(/app\.use\(\s*(?:["'`]([^"'`]*)["'`]\s*,\s*)?(\w+)\s*\)/g)]
    .filter((m) => imports[m[2]])
    .map((m) => ({ prefix: m[1] || "", variable: m[2], file: imports[m[2]] }));
  const conditional = new Set(
    [...appText.matchAll(/if\s*\(([^)]*)\)\s*\{\s*app\.use\(\s*["'`]([^"'`]*)["'`]/g)].map((m) => m[2]),
  );
  return mounts.map((m) => ({ ...m, conditional: conditional.has(m.prefix) }));
};

const HANDLER_START = /(?:async\s*)?\(\s*req\b|(?:async\s+)?function\b|\(\s*_req\b/;

/** Pull middleware + validator hints out of the argument text before the handler. */
const middlewareHints = (argsText) => {
  const head = argsText.split(HANDLER_START)[0];
  const known = [
    ["ensureAuthenticated", /\bensureAuthenticated\b/],
    ["passport.authenticate", /passport\.authenticate\(/],
    ["validateMiddleware", /\bvalidateMiddleware\(/],
    ["expressPlayground", /\bexpressPlayground\(/],
  ];
  const middleware = known.filter(([, re]) => re.test(head)).map(([name]) => name);
  const validators = uniqSorted([...head.matchAll(/\b(\w+(?:Validator|Validation)|sanitize\w+)\b/g)].map((m) => m[1]));
  return { middleware, validators };
};

/**
 * Parse `router.METHOD("path", …)` / `app.METHOD("path", …)` calls (multi-line aware).
 * Returns routes with start/end lines (span of the whole call) for diff intersection.
 */
export const parseRouterText = (text, file, prefix = "") => {
  const at = lineIndex(text);
  const re = /\b(router|app)\s*\.\s*(get|post|put|patch|delete)\s*\(\s*(["'`])([^"'`]*)\3/g;
  return [...text.matchAll(re)].map((m) => {
    const openParen = text.indexOf("(", m.index + m[1].length);
    const closeParen = matchBracket(text, openParen);
    const args = text.slice(m.index + m[0].length, closeParen);
    const path = joinPath(prefix, m[4]);
    return {
      method: m[2].toUpperCase(),
      path,
      localPath: m[4],
      file,
      line: at(m.index),
      endLine: at(closeParen),
      body: text.slice(m.index, closeParen + 1),
      ...middlewareHints(args),
    };
  });
};

/** All Express routes of the app, sorted by path then method. */
export const scanApiRoutes = (root) => {
  const appFile = "backend/app.ts";
  const appText = readText(root, appFile);
  const mounts = parseMounts(appText);
  const mounted = mounts.flatMap(({ prefix, file, conditional }) =>
    parseRouterText(readText(root, file), file, prefix).map((r) => ({
      ...r,
      notes: conditional ? ["mounted only when NODE_ENV is test/development"] : [],
    })),
  );
  const appLevel = parseRouterText(appText, appFile, "").map((r) => ({ ...r, notes: ["app-level"] }));
  // `app.use("/graphql", graphqlHandler(...))` serves GraphQL over POST (and GET for queries).
  const at = lineIndex(appText);
  const graphql = [...appText.matchAll(/app\.use\(\s*["'`]([^"'`]+)["'`]\s*,\s*graphqlHandler\(/g)].map((m) => ({
    method: "POST",
    path: normalizePath(m[1]),
    localPath: m[1],
    file: appFile,
    line: at(m.index),
    endLine: at(matchBracket(appText, appText.indexOf("(", m.index))),
    body: "",
    middleware: ["graphqlHandler"],
    validators: [],
    notes: ["GraphQL endpoint (app.use + graphqlHandler)"],
  }));
  const unique = new Map();
  [...mounted, ...appLevel, ...graphql].forEach((r) => {
    const key = `${r.method} ${r.path}`;
    if (!unique.has(key)) unique.set(key, r);
  });
  return [...unique.values()].sort(byKey("path", "method"));
};

/** Mount prefix for a backend file (used by impact to parse arbitrary file versions). */
export const prefixFor = (root, file) => {
  const mount = parseMounts(readText(root, "backend/app.ts")).find((m) => m.file === file);
  return mount ? mount.prefix : file === "backend/app.ts" ? "" : null;
};

// ---- UI routes ------------------------------------------------------------------------

export const scanUiRoutes = (root) =>
  walk(root, "src/containers", (f) => f.endsWith(".tsx") && !f.endsWith(".cy.tsx")).flatMap((file) => {
    const text = readText(root, file);
    const at = lineIndex(text);
    return [...text.matchAll(/<(\w*Route)\b([^>]*?)(\/?)>/g)]
      .map((m) => {
        const attrs = m[2];
        const path = (attrs.match(/\bpath=(?:\{\s*)?["'`]([^"'`]+)["'`]/) || [])[1];
        if (!path) return null;
        const viaProp = (attrs.match(/\bcomponent=\{\s*(\w+)/) || [])[1];
        const child = m[3] ? null : (text.slice(m.index + m[0].length).match(/<\s*(\w+)/) || [])[1];
        const redirect = child === "Redirect" ? (text.slice(m.index).match(/pathname:\s*["'`]([^"'`]+)/) || [])[1] : null;
        return {
          path,
          element: m[1],
          component: viaProp || (child && child !== `/${m[1]}` ? child : "(none)"),
          exact: /\bexact\b/.test(attrs),
          redirect,
          file,
          line: at(m.index),
        };
      })
      .filter(Boolean);
  });

// ---- data-test selectors --------------------------------------------------------------

/** `${transaction.id}` → `{id}`; `${snackbarState?.context.severity}` → `{severity}`. */
const templateToPattern = (tpl) =>
  tpl.replace(/\$\{([^}]*)\}/g, (_, expr) => {
    const ids = expr.match(/[A-Za-z_$][\w$]*/g) || ["value"];
    return `{${ids[ids.length - 1]}}`;
  });

/** Every data-test value declared in one source text. */
export const extractDataTests = (text) => {
  const at = lineIndex(text);
  const found = [];
  const push = (raw, index, kind, isTemplate) => {
    const dynamic = isTemplate && raw.includes("${");
    const value = dynamic ? templateToPattern(raw) : raw;
    found.push({ value, dynamic, kind, line: at(index), prefix: dynamic ? value.split("{")[0] : value });
  };
  const patterns = [
    [/data-test=(["'])([^"'\n]+)\1/g, "attr", false],
    [/data-test=\{\s*(["'])([^"'\n]+)\1\s*\}/g, "attr", false],
    [/data-test=\{\s*(`)([^`]+)`\s*\}/g, "attr", true],
    [/["']data-test["']\s*:\s*(["'])([^"'\n]+)\1/g, "inputProps", false],
    [/["']data-test["']\s*:\s*(`)([^`]+)`/g, "inputProps", true],
    [/\bdataTest=(["'])([^"'\n]+)\1/g, "dataTest prop", false],
  ];
  patterns.forEach(([re, kind, isTemplate]) =>
    [...text.matchAll(re)].forEach((m) => push(m[2], m.index, kind, isTemplate)),
  );
  return found.sort(byKey("line", "value"));
};

const isSourceFile = (f) =>
  /\.(tsx?|jsx?)$/.test(f) && !/\.cy\.tsx?$/.test(f) && !/\.(test|spec)\.tsx?$/.test(f) && !f.includes("__tests__");

/** All selectors in src/**, grouped-ready (component = file basename). */
export const scanSelectors = (root) =>
  walk(root, "src", isSourceFile)
    .flatMap((file) =>
      extractDataTests(readText(root, file)).map((s) => ({
        ...s,
        file,
        component: basename(file, extname(file)),
      })),
    )
    .sort(byKey("component", "value", "line"));

// ---- tests ----------------------------------------------------------------------------

const TITLE_RE =
  /(^|[^\w.$])((?:test\.describe|describe|context|test|it)(?:\.(?:only|skip|fixme|serial|parallel|fail|slow))*)\s*\(\s*(["'`])((?:\\.|(?!\3)[^\\])*)\3/gm;

/** describe/test titles of one spec text, in source order, with nesting depth from braces. */
export const extractTestTitles = (text) => {
  const at = lineIndex(text);
  const depthAt = (() => {
    // brace depth before each index, ignoring strings (good enough for spec files)
    const depth = new Int32Array(text.length + 1);
    let d = 0;
    let quote = null;
    for (let i = 0; i < text.length; i += 1) {
      depth[i] = d;
      const ch = text[i];
      if (quote) {
        if (ch === "\\") {
          i += 1;
          depth[i] = d;
        } else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") quote = ch;
      else if (ch === "{") d += 1;
      else if (ch === "}") d -= 1;
    }
    depth[text.length] = d;
    return (i) => depth[i];
  })();
  const raw = [...text.matchAll(TITLE_RE)].map((m) => {
    const index = m.index + m[1].length;
    const fn = m[2];
    const kind = /^(test\.describe|describe|context)/.test(fn) ? "suite" : "test";
    return { kind, fn, title: m[4], line: at(index), depth: depthAt(index) };
  });
  const depths = uniqSorted(raw.map((r) => r.depth)).sort((a, b) => a - b);
  return raw.map((r) => ({ ...r, level: depths.indexOf(r.depth) }));
};

export const TEST_SOURCES = [
  { framework: "playwright", dir: "playwright/tests", keep: (f) => /\.spec\.ts$/.test(f) },
  { framework: "cypress", dir: "cypress/tests", keep: (f) => /\.spec\.ts$/.test(f) },
  { framework: "cypress-component", dir: "src", keep: (f) => /\.cy\.tsx?$/.test(f) },
];

/** Helper code that also references routes/selectors on behalf of tests. */
export const HELPER_SOURCES = [
  { framework: "playwright-helpers", dir: "playwright/src", keep: (f) => /\.ts$/.test(f) },
  { framework: "cypress-support", dir: "cypress/support", keep: (f) => /\.(ts|js)$/.test(f) },
];

export const scanTests = (root, sources = TEST_SOURCES) =>
  sources.flatMap(({ framework, dir, keep }) =>
    walk(root, dir, keep).map((file) => {
      const text = readText(root, file);
      const titles = extractTestTitles(text);
      return {
        framework,
        file,
        text,
        titles,
        suites: titles.filter((t) => t.kind === "suite").length,
        tests: titles.filter((t) => t.kind === "test").length,
      };
    }),
  );

// ---- API references from tests ----------------------------------------------------------

/** endpoints.ts keys → path and playwright/src/api/*.ts exported functions → {method, path}. */
export const buildApiIndex = (root) => {
  const epText = readText(root, "playwright/src/api/endpoints.ts");
  const endpoints = Object.fromEntries(
    [...epText.matchAll(/^\s*(\w+)\s*:\s*(?:\([^)]*\)\s*=>\s*)?(["'`])([^"'`]+)\2/gm)].map((m) => [
      m[1],
      m[3].replace(/\$\{[^}]+\}/g, ":p"),
    ]),
  );
  const httpVerb = { get: "GET", post: "POST", put: "PUT", patch: "PATCH", del: "DELETE", delete: "DELETE" };
  const functions = walk(root, "playwright/src/api", (f) => f.endsWith(".ts") && !f.endsWith("endpoints.ts")).flatMap(
    (file) => {
      const text = readText(root, file);
      const decls = [...text.matchAll(/export\s+const\s+(\w+)\s*=/g)];
      return decls.flatMap((m, i) => {
        const body = text.slice(m.index, decls[i + 1]?.index ?? text.length);
        const call = body.match(/\b(get|post|put|patch|del|delete)\s*(?:<[^()]*?>)?\(\s*\w+\s*,\s*endpoints\.(\w+)/);
        if (call && endpoints[call[2]]) return [{ name: m[1], method: httpVerb[call[1]], path: endpoints[call[2]], file }];
        const login = body.match(/endpoints\.(\w+)/);
        return login && endpoints[login[1]] ? [{ name: m[1], method: null, path: endpoints[login[1]], file }] : [];
      });
    },
  );
  return { endpoints, functions };
};

const PATH_LIKE = /^\/[A-Za-z0-9_:\-./{}]*$/;

/** Resolve `const apiX = \`${Cypress.expose("apiUrl")}/bankAccounts\`` style constants. */
const pathConstants = (text) =>
  Object.fromEntries(
    [...text.matchAll(/const\s+(\w+)\s*=\s*(["'`])((?:\$\{[^}]*\})?)(\/[^"'`$]*)\2/g)].map((m) => [m[1], m[4]]),
  );

const cleanRefPath = (p) => {
  const noQuery = p
    .split("?")[0]
    .split("#")[0]
    .replace(/\/\*+(?=\/|$)/g, "/:p") // cy.intercept("PATCH", "/transactions/*")
    .replace(/\*+$/, ""); // "/users*"
  if (!noQuery || noQuery === "/" || !PATH_LIKE.test(noQuery)) return null; // bare "/" is the UI root, ambiguous
  return normalizePath(noQuery);
};

/**
 * API references in a test/helper file: [{method|null, path, how}]
 *  - "title": `GET /bankAccounts/:id` text in describe/test titles or comments
 *  - "request": `cy.request("GET", url)`, `{ method: "GET", url }`, `cy.intercept("POST", "/users")`
 *  - "literal": any quoted/template path string ("/notifications", `${apiTransactions}/${id}`)
 *  - "endpoints": `endpoints.bankAccounts`
 *  - "api-fn": calls to playwright/src/api functions (method known)
 */
export const apiRefsOf = (text, apiIndex = { endpoints: {}, functions: [] }) => {
  const consts = pathConstants(text);
  const refs = [];
  const add = (method, path, how) => {
    const clean = path && cleanRefPath(path);
    if (clean) refs.push({ method, path: clean, how });
  };
  [...text.matchAll(/\b(GET|POST|PUT|PATCH|DELETE)\s+(\/[\w/:.{}\-]*)/g)].forEach((m) => add(m[1], m[2], "title"));
  [...text.matchAll(/(["'`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)].forEach((m) => {
    const raw = m[2];
    const resolved =
      m[1] === "`"
        ? raw.replace(/\$\{\s*([\w.]+)\s*\}/g, (all, expr) =>
            consts[expr] !== undefined
              ? consts[expr]
              : expr.startsWith("endpoints.") && apiIndex.endpoints[expr.slice(10)]
                ? apiIndex.endpoints[expr.slice(10)]
                : ":p",
          ).replace(/\$\{[^}]*\}/g, ":p")
        : raw;
    // drop a leading base-url placeholder: `${apiUrl}/x` → `:p/x`
    const path = resolved.replace(/^:p(?=\/)/, "");
    if (!path.startsWith("/") || path.startsWith("//")) return;
    const before = text.slice(Math.max(0, m.index - 120), m.index);
    const direct = before.match(/["'`](GET|POST|PUT|PATCH|DELETE)["'`]\s*,\s*$/);
    const objectStyle = before.match(/method\s*:\s*["'`](GET|POST|PUT|PATCH|DELETE)["'`][^{}]*?url\s*:\s*$/);
    const method = (direct && direct[1]) || (objectStyle && objectStyle[1]) || null;
    add(method, path, method ? "request" : "literal");
  });
  // bare constant usage: cy.request("GET", apiBankAccounts)
  Object.entries(consts).forEach(([name, path]) =>
    [...text.matchAll(new RegExp(`["'\`](GET|POST|PUT|PATCH|DELETE)["'\`]\\s*,\\s*${name}\\b(?!\\s*\\})`, "g"))].forEach((m) =>
      add(m[1], path, "request"),
    ),
  );
  [...text.matchAll(/\bendpoints\.(\w+)/g)].forEach((m) => {
    if (apiIndex.endpoints[m[1]]) add(null, apiIndex.endpoints[m[1]], "endpoints");
  });
  // api functions only count in files that import the Playwright API layer (avoids `login(page)` UI helpers)
  const importsApi = /from\s+["'](?:@api(?:\/\w+)?|(?:\.{1,2}\/)+(?:src\/)?api(?:\/\w+)?)["']/.test(text);
  if (importsApi)
    apiIndex.functions.forEach((fn) => {
      if (new RegExp(`(?:^|[^\\w$])${fn.name}\\s*\\(`).test(text)) add(fn.method, fn.path, `api-fn ${fn.name}`);
    });
  const seen = new Set();
  return refs.filter((r) => {
    const key = `${r.method} ${r.path} ${r.how}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Routes hit by one reference. Most specific path wins (`/transactions/public` beats
 * `/transactions/:transactionId`). With a method, only that method; otherwise every method.
 */
export const matchRoutes = (routes, ref) => {
  const scored = routes.map((r) => ({ r, s: pathScore(r.path, ref.path) })).filter((x) => x.s >= 0);
  if (!scored.length) return [];
  const best = Math.max(...scored.map((x) => x.s));
  const candidates = scored.filter((x) => x.s === best).map((x) => x.r);
  return ref.method ? candidates.filter((r) => r.method === ref.method) : candidates;
};

export const routeKey = (r) => `${r.method} ${r.path}`;

/**
 * For each route key: { exact: Set(files referencing METHOD+path), path: Set(files referencing the path only) }.
 */
export const routeCoverage = (routes, files, apiIndex) => {
  const cov = new Map(routes.map((r) => [routeKey(r), { exact: new Set(), path: new Set() }]));
  files.forEach(({ file, text }) =>
    apiRefsOf(text, apiIndex).forEach((ref) =>
      matchRoutes(routes, ref).forEach((r) => cov.get(routeKey(r))[ref.method ? "exact" : "path"].add(file)),
    ),
  );
  cov.forEach((c) => c.exact.forEach((f) => c.path.delete(f)));
  return cov;
};

// ---- selector references from tests -----------------------------------------------------

/**
 * Selector tokens in a test/helper file:
 *  exact  — string literals that look like data-test values ("signin-submit")
 *  prefix — template literal static prefixes (`transaction-item-${id}` → "transaction-item-")
 *  like   — fragments used for partial matching: bySelLike/getBySelLike/textbox/[data-test*=…]
 */
export const selectorRefsOf = (text) => {
  const exact = new Set();
  const prefix = new Set();
  const templates = new Set();
  const like = new Set();
  const looksLikeSel = (s) => /^[A-Za-z][\w-]*$/.test(s) && s.includes("-");
  [...text.matchAll(/(["'])([A-Za-z][\w-]*)\1/g)].forEach((m) => looksLikeSel(m[2]) && exact.add(m[2]));
  [...text.matchAll(/`([^`]*)`/g)].forEach((m) => {
    const t = m[1];
    const staticPrefix = t.split("${")[0];
    if (t.includes("${")) {
      if (/^[A-Za-z][\w-]*-$/.test(staticPrefix) && /^[\w-]*(\$\{[^}]*\}[\w-]*)+$/.test(t)) {
        prefix.add(staticPrefix);
        // `bankaccount-${name}-input` → /^bankaccount-[\w-]+-input$/ (suffix must match too)
        templates.add(`^${t.replace(/\$\{[^}]*\}/g, "\u0000").replace(/[.*+?^$()|[\]\\]/g, "\\$&").split("\u0000").join("[\\w-]+")}$`);
      }
    } else if (looksLikeSel(t)) exact.add(t);
  });
  [...text.matchAll(/\b\w*(?:Like|textbox)\s*\(\s*(?:[\w.]+\s*,\s*)?(["'`])([A-Za-z][\w-]*)/g)].forEach((m) =>
    like.add(m[2]),
  );
  [...text.matchAll(/data-test\*=\s*["']?([A-Za-z][\w-]*)/g)].forEach((m) => like.add(m[1]));
  [...text.matchAll(/data-test=\s*["']?([A-Za-z][\w-]*)/g)].forEach((m) => exact.add(m[1]));
  // single-word selectors ("signup", "main") only count when passed to a selector helper
  [...text.matchAll(/\b(?:bySel|getBySel|bySelLike|getBySelLike)\s*\(\s*(?:[\w.]+\s*,\s*)?(["'`])([A-Za-z][\w-]*)\1/g)].forEach(
    (m) => exact.add(m[2]),
  );
  return { exact, prefix, templates, like };
};

/** How (if at all) a declared selector is referenced: "exact" | "pattern" | "partial" | null. */
export const selectorReferenced = (sel, refs) => {
  if (!sel.dynamic && refs.exact.has(sel.value)) return "exact";
  if (sel.dynamic) {
    if ([...refs.prefix].some((p) => p === sel.prefix || p.startsWith(sel.prefix))) return "pattern";
    if (refs.exact.has(sel.prefix.replace(/-$/, ""))) return "partial";
  } else if ([...(refs.templates || [])].some((re) => new RegExp(re).test(sel.value))) return "pattern";
  const target = sel.dynamic ? sel.prefix : sel.value;
  if ([...refs.like].some((f) => f.length >= 4 && target.includes(f))) return "partial";
  // composed selectors: `nav-${tab}` with tab: "public-tab" → literal "public-tab" is a suffix of "nav-public-tab"
  if (!sel.dynamic && [...refs.exact].some((t) => t.length >= 6 && t.includes("-") && sel.value.endsWith(`-${t}`)))
    return "partial";
  return null;
};

/** Plain-text search for a selector string in arbitrary text (used for removed selectors). */
export const mentionsSelector = (text, value) => {
  const needle = value.includes("{") ? value.split("{")[0] : value;
  return needle.length > 2 && text.includes(needle);
};

// ---- XState machines ------------------------------------------------------------------

const topLevelKeys = (block) => {
  const keys = [];
  let depth = 0;
  let quote = null;
  for (let i = 0; i < block.length; i += 1) {
    const ch = block[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{" || ch === "[" || ch === "(") depth += 1;
    else if (ch === "}" || ch === "]" || ch === ")") depth -= 1;
    else if (depth === 1 && /[A-Za-z_$"']/.test(ch) && /[\s{,]/.test(block[i - 1] || " ")) {
      const m = block.slice(i).match(/^["']?([A-Za-z_$][\w$]*)["']?\s*:/);
      if (m) {
        keys.push(m[1]);
        i += m[0].length - 1;
      }
    }
  }
  return keys;
};

export const parseMachineText = (text, file) => {
  const ids = [
    ...[...text.matchAll(/\bid\s*:\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]),
    ...[...text.matchAll(/\bdataMachine\(\s*["'`]([^"'`]+)["'`]\s*\)/g)].map((m) => m[1]),
  ];
  const factory = /export\s+const\s+dataMachine\s*=\s*\(\s*(\w+)/.test(text);
  const statesIdx = text.search(/\bstates\s*:\s*\{/);
  const machineCall = text.search(/\b(Machine|createMachine)\s*</) >= 0 || text.search(/\b(Machine|createMachine)\s*\(/) >= 0;
  // prefer the runtime config `states: {` that follows Machine( … ), fall back to the schema interface
  const configIdx = (() => {
    const call = text.search(/\b(?:Machine|createMachine)\s*(?:<[\s\S]*?>)?\s*\(/);
    if (call < 0) return statesIdx;
    const rest = text.slice(call);
    const i = rest.search(/\bstates\s*:\s*\{/);
    return i < 0 ? statesIdx : call + i;
  })();
  const states =
    configIdx >= 0 && machineCall
      ? topLevelKeys(text.slice(text.indexOf("{", configIdx), matchBracket(text, text.indexOf("{", configIdx)) + 1))
      : [];
  const events = uniqSorted([
    ...[...text.matchAll(/\btype\s*:\s*["'`]([A-Z][A-Z0-9_.]*)["'`]/g)].map((m) => m[1]),
    ...[...text.matchAll(/(?:^|[\s{,])["']?([A-Z][A-Z0-9_]{2,})["']?\s*:/gm)].map((m) => m[1]),
  ]);
  const services = uniqSorted([...text.matchAll(/export\s+const\s+(\w+Service)\s*=/g)].map((m) => m[1]));
  const usesDataMachine = /\bdataMachine\(/.test(text) && !factory;
  return {
    file,
    name: basename(file, extname(file)),
    ids: factory ? ["(factory: dataMachine(id))"] : uniq(ids),
    states: uniq(states),
    events,
    services,
    extendsDataMachine: usesDataMachine,
  };
};

export const scanMachines = (root) =>
  walk(root, "src/machines", (f) => /\.ts$/.test(f)).map((file) => parseMachineText(readText(root, file), file));

/**
 * window.<name>Service = … exposures and which machine modules feed them.
 * Returns [{ service, file, machines: [machine module names] }].
 */
export const scanWindowServices = (root) =>
  walk(root, "src", isSourceFile).flatMap((file) => {
    const text = readText(root, file);
    // imported name → machine module, e.g. { authService: "authMachine", usersMachine: "usersMachine" }
    const importedFrom = Object.fromEntries(
      [...text.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'](?:\.{1,2}\/)*machines\/(\w+)["']/g)].flatMap((m) =>
        m[1]
          .split(",")
          .map((s) => s.trim().split(/\s+as\s+/).pop())
          .filter(Boolean)
          .map((name) => [name, m[2]]),
      ),
    );
    const allMachines = uniqSorted(Object.values(importedFrom));
    const machinesFor = (service) => {
      if (importedFrom[service]) return [importedFrom[service]];
      const viaHook = text.match(new RegExp(`\\[[^\\]]*\\b${service}\\b[^\\]]*\\]\\s*=\\s*useMachine\\(\\s*(\\w+)`));
      if (viaHook && importedFrom[viaHook[1]]) return [importedFrom[viaHook[1]]];
      return allMachines;
    };
    return uniqSorted([...text.matchAll(/window\.(\w+Service)\s*=/g)].map((m) => m[1])).map((service) => ({
      service,
      file,
      machines: machinesFor(service),
    }));
  });

// ---- misc -------------------------------------------------------------------------------

export const fileExists = (root, f) => existsSync(join(root, f)) && statSync(join(root, f)).isFile();

/** Enclosing `export const NAME` (or `const NAME =`) for each line of a file. */
export const enclosingExports = (text) => {
  const at = lineIndex(text);
  const decls = [...text.matchAll(/^(?:export\s+)?(?:const|function|let)\s+(\w+)/gm)].map((m) => ({
    name: m[1],
    line: at(m.index),
  }));
  return (line) => {
    const before = decls.filter((d) => d.line <= line);
    return before.length ? before[before.length - 1].name : null;
  };
};
