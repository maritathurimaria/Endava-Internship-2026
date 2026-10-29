/**
 * Shared helpers for TAP26-Junior hooks. Zero dependencies, cross-platform (Node ≥ 18).
 * Hooks must never break a session: every entry point catches its own errors and exits 0
 * unless it deliberately blocks an action.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = process.env.CLAUDE_PROJECT_DIR || resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const MEMORY_DIR = join(ROOT, "tap26", "memory");
export const STATE_DIR = join(MEMORY_DIR, ".state");

/** Local wall-clock time "YYYY-MM-DD HH:MM" (memory is read by humans in their own timezone). */
export const stamp = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const today = () => stamp().slice(0, 10);

/** Read and parse the hook payload from stdin ({} if none or invalid). */
export const readInput = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
};

export const appendLine = (file, line) => {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, `${line}\n`);
};

export const readText = (file) => (existsSync(file) ? readFileSync(file, "utf8") : "");

export const readJson = (file, fallback) => {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};

export const writeJson = (file, value) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2));
};

/** Repo-relative, forward-slash path (works for Windows paths too). */
export const repoPath = (file) => relative(ROOT, resolve(ROOT, file || "")).split(sep).join("/");

export const journal = (text) =>
  process.env.TAP26_JOURNAL === "0"
    ? undefined
    : appendLine(join(MEMORY_DIR, "journal", `${today()}.md`), `- ${stamp().slice(11)} ${text}`);

/** Emit a JSON hook response and exit 0. */
export const respond = (payload) => {
  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
};

/** Run a hook body safely: any unexpected error is logged to stderr and ignored. */
export const safely = async (body) => {
  try {
    await body();
  } catch (error) {
    process.stderr.write(`[tap26 hook] ${error?.message ?? error}\n`);
  }
  process.exit(0);
};

/** Increment usage counters (skills / agents) used by the knowledge-curator for metrics. */
export const countUsage = (kind, name) => {
  if (!name) return;
  const file = join(STATE_DIR, "usage.json");
  const usage = readJson(file, {});
  const bucket = usage[kind] ?? {};
  writeJson(file, { ...usage, [kind]: { ...bucket, [name]: (bucket[name] ?? 0) + 1 }, updated: stamp() });
};
