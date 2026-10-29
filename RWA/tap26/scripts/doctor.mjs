#!/usr/bin/env node
/**
 * TAP26-Junior environment & health doctor (zero dependencies, cross-platform).
 *
 * Checks the toolchain, dependencies, browsers, ports, the running app and TAP26 assets,
 * and prints a table: ✔ ok · ⚠ warning (works, but look at the hint) · ✘ broken (fix first).
 * Every non-ok row carries the exact command that fixes it.
 *
 * Usage:
 *   node tap26/scripts/doctor.mjs            # full check
 *   node tap26/scripts/doctor.mjs --quick    # only ports + UI/API reachability + database file
 *   node tap26/scripts/doctor.mjs --json     # machine-readable result
 *   node tap26/scripts/doctor.mjs --ui <url> --api <url>   # override http://localhost:3000 / :3001
 *
 * In full mode a stopped app is only a warning (you may not have started it yet);
 * in --quick mode (used to verify a running app) a stopped app is an error.
 * Exit codes: 0 no ✘ rows · 1 at least one ✘ row.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { homedir, platform } from "node:os";
import { spawnSync } from "node:child_process";
import { connect } from "node:net";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
  process.exit(0);
}
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const QUICK = args.includes("--quick");
const JSON_OUT = args.includes("--json");
const UI_URL = flag("ui", "http://localhost:3000").replace(/\/$/, "");
const API_URL = flag("api", "http://localhost:3001").replace(/\/$/, "");
const IS_WIN = platform() === "win32";

const OK = "ok";
const WARN = "warn";
const FAIL = "fail";
const row = (group, name, status, detail, hint = "") => ({ group, name, status, detail, hint: status === OK ? "" : hint });

// ---- helpers --------------------------------------------------------------------------

/** Run a command (through the shell so yarn.cmd / npx.cmd resolve on Windows). */
const run = (cmd, cmdArgs = [], cwd = ROOT, timeout = 20000) => {
  const res = spawnSync(cmd, cmdArgs, { cwd, encoding: "utf8", shell: true, timeout, windowsHide: true });
  return { ok: res.status === 0, out: `${res.stdout || ""}`.trim(), err: `${res.stderr || ""}`.trim() };
};

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
};

const probePort = (port, host, timeout = 800) =>
  new Promise((done) => {
    const socket = connect({ port, host });
    const finish = (open) => {
      socket.destroy();
      done(open);
    };
    socket.setTimeout(timeout, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });

/** Listening on IPv4 or IPv6 loopback (Vite may bind only to ::1 on some machines). */
const isListening = async (port) => (await probePort(port, "127.0.0.1")) || (await probePort(port, "::1"));

const httpGet = async (url, timeout = 5000) => {
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeout), redirect: "manual" });
    const text = await res.text();
    return { status: res.status, text, ms: Date.now() - started };
  } catch (error) {
    return { status: 0, text: "", ms: Date.now() - started, error: error.cause?.code || error.name || error.message };
  }
};

const portOf = (url) => Number(new URL(url).port || (url.startsWith("https") ? 443 : 80));

/** Default Playwright browser cache per OS (overridden by PLAYWRIGHT_BROWSERS_PATH). */
const browsersDir = () => {
  const env = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (env && env !== "0") return { dir: env, source: "PLAYWRIGHT_BROWSERS_PATH" };
  if (env === "0") return { dir: join(ROOT, "playwright", "node_modules", "playwright-core", ".local-browsers"), source: "PLAYWRIGHT_BROWSERS_PATH=0" };
  if (IS_WIN) return { dir: join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "ms-playwright"), source: "default (Windows)" };
  if (platform() === "darwin") return { dir: join(homedir(), "Library", "Caches", "ms-playwright"), source: "default (macOS)" };
  return { dir: join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "ms-playwright"), source: "default (Linux)" };
};

// ---- checks ---------------------------------------------------------------------------

const checkNode = () => {
  const wanted = existsSync(join(ROOT, ".nvmrc")) ? readFileSync(join(ROOT, ".nvmrc"), "utf8").trim().replace(/^v/, "") : "";
  const have = process.versions.node;
  const major = (v) => Number(String(v).split(".")[0]);
  if (major(have) < 18) return row("toolchain", "Node.js", FAIL, `v${have} (TAP26 scripts need ≥ 18, app wants ${wanted || "22"})`, `nvm install ${wanted || 22} && nvm use ${wanted || 22}`);
  if (!wanted) return row("toolchain", "Node.js", WARN, `v${have} (.nvmrc missing)`, "git checkout -- .nvmrc");
  return major(have) === major(wanted)
    ? row("toolchain", "Node.js", OK, `v${have} (.nvmrc ${wanted})`)
    : row("toolchain", "Node.js", WARN, `v${have} but .nvmrc wants ${wanted}`, `nvm install ${wanted} && nvm use ${wanted}   (Windows: nvm-windows / fnm)`);
};

const checkYarn = () => {
  const res = run("yarn", ["--version"]);
  if (!res.ok) return row("toolchain", "Yarn", FAIL, "not found on PATH", "npm install -g yarn@1   (or: corepack enable && corepack prepare yarn@1.22.22 --activate)");
  return res.out.startsWith("1.")
    ? row("toolchain", "Yarn", OK, `v${res.out} (classic)`)
    : row("toolchain", "Yarn", WARN, `v${res.out} — the app expects Yarn 1 classic`, "corepack prepare yarn@1.22.22 --activate   (or: npm install -g yarn@1)");
};

const checkRootDeps = () => {
  const ok = existsSync(join(ROOT, "node_modules")) && existsSync(join(ROOT, "node_modules", ".yarn-integrity"));
  const present = existsSync(join(ROOT, "node_modules"));
  if (ok) return row("dependencies", "App node_modules", OK, "installed");
  return present
    ? row("dependencies", "App node_modules", WARN, "present but no .yarn-integrity (partial install?)", "CYPRESS_INSTALL_BINARY=0 yarn install")
    : row("dependencies", "App node_modules", FAIL, "missing", "CYPRESS_INSTALL_BINARY=0 yarn install");
};

const checkPlaywrightDeps = () => {
  const dir = join(ROOT, "playwright", "node_modules");
  if (!existsSync(join(dir, "@playwright", "test")))
    return row("dependencies", "playwright/node_modules", FAIL, existsSync(dir) ? "@playwright/test missing" : "missing", "cd playwright && npm ci");
  const version = readJson(join(dir, "@playwright", "test", "package.json"))?.version || "?";
  return row("dependencies", "playwright/node_modules", OK, `@playwright/test ${version}`);
};

const checkPlaywrightBrowser = () => {
  const cwd = join(ROOT, "playwright");
  const fix = "cd playwright && npx playwright install chromium";
  if (!existsSync(join(cwd, "node_modules", "playwright-core"))) return row("dependencies", "Playwright Chromium", FAIL, "playwright-core not installed", "cd playwright && npm ci && npx playwright install chromium");
  const cli = run("npx", ["--no-install", "playwright", "--version"], cwd);
  const version = cli.ok ? cli.out.replace(/^Version\s*/i, "") : "CLI not runnable";
  const browsers = readJson(join(cwd, "node_modules", "playwright-core", "browsers.json"))?.browsers || [];
  const wanted = browsers.filter((b) => b.name === "chromium" || b.name === "chromium-headless-shell");
  const { dir, source } = browsersDir();
  const entries = existsSync(dir) ? readdirSync(dir) : [];
  const folder = (b) => `${b.name.replace(/-/g, "_")}-${b.revision}`;
  const missing = wanted.filter((b) => !entries.includes(folder(b)));
  if (!cli.ok) return row("dependencies", "Playwright Chromium", FAIL, `playwright CLI failed: ${(cli.err || cli.out).split("\n")[0]}`, "cd playwright && npm ci");
  if (!wanted.length) return row("dependencies", "Playwright Chromium", WARN, `CLI ${version}; cannot read browsers.json`, fix);
  if (missing.length)
    return row("dependencies", "Playwright Chromium", FAIL, `CLI ${version}; missing ${missing.map(folder).join(", ")} in ${dir} [${source}]`, fix);
  return row("dependencies", "Playwright Chromium", OK, `CLI ${version}; ${wanted.map(folder).join(", ")} in ${dir}`);
};

const PORTS = [
  { port: 3000, what: "UI (Vite)", app: true, start: "yarn dev" },
  { port: 3001, what: "API (Express)", app: true, start: "yarn dev" },
  { port: 3100, what: "Swagger UI", app: false, start: "node tap26/scripts/swagger-server.mjs" },
  { port: 3101, what: "Mock API", app: false, start: "node tap26/scripts/mock-server.mjs" },
];

const checkPorts = async () =>
  Promise.all(
    PORTS.map(async ({ port, what, app, start }) => {
      const open = await isListening(port);
      const name = `Port ${port} ${what}`;
      if (open) return row("ports", name, OK, "listening");
      if (!app) return row("ports", name, OK, `free (start with: ${start})`);
      return row("ports", name, QUICK ? FAIL : WARN, "nothing listening — app not running", start);
    }),
  );

const checkUi = async () => {
  if (!(await isListening(portOf(UI_URL)))) return row("app", "UI reachable", QUICK ? FAIL : WARN, `${UI_URL} not running`, "yarn dev");
  const res = await httpGet(`${UI_URL}/`);
  if (res.status === 200) return row("app", "UI reachable", OK, `GET ${UI_URL} → 200 (${res.ms} ms)`);
  return row("app", "UI reachable", FAIL, `GET ${UI_URL} → ${res.status || res.error}`, "check the `yarn dev` terminal for Vite errors, then restart: yarn dev");
};

const checkApi = async () => {
  if (!(await isListening(portOf(API_URL)))) return row("app", "API reachable", QUICK ? FAIL : WARN, `${API_URL} not running`, "yarn dev");
  const res = await httpGet(`${API_URL}/testData/users`);
  if (res.status === 200) {
    const users = (() => {
      try {
        return JSON.parse(res.text).results?.length ?? "?";
      } catch {
        return "?";
      }
    })();
    return users === 0
      ? row("app", "API reachable", WARN, `GET /testData/users → 200 but 0 users`, "curl -s -X POST http://localhost:3001/testData/seed")
      : row("app", "API reachable", OK, `GET /testData/users → 200, ${users} users (${res.ms} ms)`);
  }
  if (res.status === 404)
    return row("app", "API reachable", WARN, "/testData not mounted (NODE_ENV is not development/test)", "stop the API and start it with: yarn dev");
  return row("app", "API reachable", FAIL, `GET /testData/users → ${res.status || res.error}`, "check the `yarn dev` terminal for API errors (nodemon restarts on backend/ edits)");
};

const checkDb = () => {
  const db = join(ROOT, "data", "database.json");
  if (!existsSync(db)) return row("app", "data/database.json", FAIL, "missing", "yarn db:seed:dev");
  const json = readJson(db);
  if (!json) return row("app", "data/database.json", FAIL, "not valid JSON (corrupted by a crash?)", "yarn db:seed:dev   (or: curl -s -X POST http://localhost:3001/testData/seed)");
  const counts = ["users", "transactions", "bankaccounts"].map((k) => `${k} ${Array.isArray(json[k]) ? json[k].length : "?"}`).join(", ");
  return row("app", "data/database.json", OK, counts);
};

const checkGit = () => {
  if (!run("git", ["--version"]).ok) return row("repo", "git status", FAIL, "git is not installed", "install Git (Windows: Git for Windows, which includes Git Bash)");
  const res = run("git", ["status", "--porcelain"]);
  if (!res.ok)
    return row("repo", "git status", WARN, "not a git repository yet (e.g. a zip download)", 'git init -b tap26-base && git add -A && git commit -m "TAP26 baseline"   (see tap26/labs/lab-01-setup.md)');
  const lines = res.out ? res.out.split("\n") : [];
  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]).out || "?";
  return row("repo", "git status", OK, lines.length ? `${branch}: ${lines.length} changed/untracked file(s) — see: node tap26/scripts/impact.mjs` : `${branch}: clean`);
};

/** Claude Code runs hooks and skill shell snippets through Git Bash on Windows. */
const checkShell = () => {
  if (!IS_WIN) return row("toolchain", "Shell for hooks", OK, `${process.env.SHELL || "POSIX shell"}`);
  const candidates = [
    process.env.CLAUDE_CODE_GIT_BASH_PATH,
    join(process.env.ProgramFiles || "C:\\Program Files", "Git", "bin", "bash.exe"),
    join(process.env.LOCALAPPDATA || "", "Programs", "Git", "bin", "bash.exe"),
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p)) || (run("where", ["bash"]).ok ? "bash on PATH" : "");
  return found
    ? row("toolchain", "Shell for hooks", OK, `Git Bash: ${found}`)
    : row("toolchain", "Shell for hooks", WARN, "Git Bash not found — hooks still run (exec form) but skill shell snippets and lab commands assume it", "install Git for Windows (https://git-scm.com/download/win) or set CLAUDE_CODE_GIT_BASH_PATH");
};

const checkClaudeConfig = () => {
  const agents = join(ROOT, ".claude", "agents");
  const count = existsSync(agents) ? readdirSync(agents).filter((f) => f.endsWith(".md")).length : 0;
  if (count >= 24) return row("tap26", "Claude Code config", OK, `.claude/: ${count} agents, settings ${existsSync(join(ROOT, ".claude", "settings.json")) ? "present" : "MISSING"}`);
  return row("tap26", "Claude Code config", FAIL, count ? `.claude/agents has only ${count} agents` : ".claude/ not installed", "node tap26/install/install.mjs   (then open a new Claude Code tab)");
};

const checkMemory = () => {
  const mem = join(ROOT, "tap26", "memory", "MEMORY.md");
  return existsSync(mem)
    ? row("tap26", "Shared memory", OK, "tap26/memory/MEMORY.md present")
    : row("tap26", "Shared memory", WARN, "tap26/memory/MEMORY.md missing", "node tap26/scripts/memory.mjs digest");
};

const checkOpenapi = () => {
  const file = join(ROOT, "tap26", "openapi", "openapi.json");
  if (!existsSync(file)) return row("tap26", "OpenAPI spec", WARN, "tap26/openapi/openapi.json missing", "ask contract-guardian: /tap-swagger (regenerates openapi.json from openapi.yaml)");
  const spec = readJson(file);
  if (!spec) return row("tap26", "OpenAPI spec", FAIL, "openapi.json is not valid JSON", "/tap-swagger (regenerate openapi.json from openapi.yaml)");
  const ops = Object.values(spec.paths || {}).reduce((n, p) => n + Object.keys(p).filter((k) => ["get", "post", "put", "patch", "delete"].includes(k)).length, 0);
  return row("tap26", "OpenAPI spec", OK, `OpenAPI ${spec.openapi || "?"}, ${Object.keys(spec.paths || {}).length} paths / ${ops} operations`);
};

// ---- main -----------------------------------------------------------------------------

const main = async () => {
  const rows = QUICK
    ? [...(await checkPorts()), await checkUi(), await checkApi(), checkDb()]
    : [
        checkNode(),
        checkYarn(),
        checkShell(),
        checkRootDeps(),
        checkPlaywrightDeps(),
        checkPlaywrightBrowser(),
        ...(await checkPorts()),
        await checkUi(),
        await checkApi(),
        checkDb(),
        checkGit(),
        checkClaudeConfig(),
        checkMemory(),
        checkOpenapi(),
      ];
  const counts = { ok: rows.filter((r) => r.status === OK).length, warn: rows.filter((r) => r.status === WARN).length, fail: rows.filter((r) => r.status === FAIL).length };

  if (JSON_OUT) {
    console.log(JSON.stringify({ mode: QUICK ? "quick" : "full", root: ROOT, counts, checks: rows }, null, 2));
  } else {
    const icon = { [OK]: "✔", [WARN]: "⚠", [FAIL]: "✘" };
    const nameW = Math.max(...rows.map((r) => r.name.length));
    const lines = rows.flatMap((r) => [
      `${icon[r.status]} ${r.name.padEnd(nameW)}  ${r.detail}`,
      ...(r.hint ? [`  ${" ".repeat(nameW)}  ↳ fix: ${r.hint}`] : []),
    ]);
    console.log(
      [
        `TAP26 doctor (${QUICK ? "quick" : "full"}) — ${ROOT}`,
        "",
        ...lines,
        "",
        `${counts.ok} ok · ${counts.warn} warning(s) · ${counts.fail} error(s)${counts.fail ? " — fix the ✘ rows first" : ""}`,
      ].join("\n"),
    );
  }
  process.exit(counts.fail ? 1 : 0);
};

main().catch((error) => {
  console.error(`doctor.mjs: ${error.stack || error.message}`);
  process.exit(1);
});
