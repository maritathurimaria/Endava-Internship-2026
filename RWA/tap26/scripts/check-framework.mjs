#!/usr/bin/env node
/**
 * TAP26-Junior framework self-check (zero dependencies).
 *
 * Validates that the agentic framework is internally consistent — run it after changing any agent,
 * skill, rule, hook, doc or lab (the knowledge-curator runs it before applying an evolution).
 *
 * Checks
 *   agents      .claude/agents/*.md frontmatter: name = file name, description, tools/model/color/memory values
 *   skills      .claude/skills/<name>/SKILL.md frontmatter: name = folder, description
 *   references  `/tap-*` slash commands and "`<agent>` agent" mentions point to real skills/agents
 *   paths       backticked repo paths (tap26/…, .claude/…, playwright/…, backend/…, src/…) exist
 *   links       relative Markdown links resolve (files and #anchors)
 *   json        settings, VS Code, package and OpenAPI JSON files parse
 *   hooks       every hook command in .claude/settings.json points to an existing script
 *
 * Usage: node tap26/scripts/check-framework.mjs [--json] [--strict]
 *   --strict  treat warnings (missing referenced paths) as errors
 * Exit: 0 ok · 1 errors (or warnings with --strict)
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = new Set(process.argv.slice(2));
const rel = (p) => relative(ROOT, p).split(sep).join("/");
const read = (p) => readFileSync(p, "utf8");

const walk = (dir, accept) =>
  existsSync(dir)
    ? readdirSync(dir).flatMap((name) => {
        const full = join(dir, name);
        if (name === "node_modules" || name.startsWith(".state")) return [];
        return statSync(full).isDirectory() ? walk(full, accept) : accept(full) ? [full] : [];
      })
    : [];

/** Minimal YAML frontmatter reader: `key: value`, inline `[a, b]` lists and block `- item` lists. */
const frontmatter = (text) => {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const lines = match[1].split(/\r?\n/);
  return lines.reduce(
    (acc, line) => {
      const item = line.match(/^\s+-\s+(.*)$/);
      if (item && acc.last) {
        const prev = acc.data[acc.last];
        return { ...acc, data: { ...acc.data, [acc.last]: [...(Array.isArray(prev) ? prev : []), item[1].replace(/^["']|["']$/g, "")] } };
      }
      const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
      if (!kv) return acc;
      const [, key, raw] = kv;
      const value = raw.startsWith("[")
        ? raw.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
        : raw.replace(/^["']|["']$/g, "");
      return { data: { ...acc.data, [key]: value }, last: key };
    },
    { data: {}, last: null },
  ).data;
};

const findings = [];
const error = (area, file, message) => findings.push({ level: "error", area, file, message });
const warn = (area, file, message) => findings.push({ level: "warn", area, file, message });

// ---- agents -------------------------------------------------------------------------------
const AGENT_TOOLS = new Set(["Read", "Grep", "Glob", "Edit", "Write", "Bash", "Agent", "WebSearch", "WebFetch", "NotebookEdit"]);
const MODELS = new Set(["inherit", "sonnet", "opus", "haiku", "fable"]);
const COLORS = new Set(["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"]);
const agentFiles = walk(join(ROOT, ".claude", "agents"), (f) => f.endsWith(".md"));
const agents = agentFiles.map((file) => {
  const fm = frontmatter(read(file));
  const expected = file.split(sep).pop().replace(/\.md$/, "");
  if (!fm) return error("agents", rel(file), "missing YAML frontmatter"), expected;
  if (fm.name !== expected) error("agents", rel(file), `name "${fm.name}" ≠ file name "${expected}"`);
  if (!fm.description || fm.description.length < 40) error("agents", rel(file), "description missing or too short");
  const tools = Array.isArray(fm.tools) ? fm.tools : String(fm.tools ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  tools.filter((t) => !AGENT_TOOLS.has(t.replace(/\(.*\)$/, ""))).forEach((t) => error("agents", rel(file), `unknown tool "${t}"`));
  if (fm.model && !MODELS.has(fm.model) && !fm.model.startsWith("claude-")) error("agents", rel(file), `unknown model "${fm.model}"`);
  if (fm.color && !COLORS.has(fm.color)) error("agents", rel(file), `unknown color "${fm.color}"`);
  if (fm.memory && !["user", "project", "local"].includes(fm.memory)) error("agents", rel(file), `memory must be user|project|local`);
  return expected;
});

// ---- skills -------------------------------------------------------------------------------
const skillDirs = existsSync(join(ROOT, ".claude", "skills")) ? readdirSync(join(ROOT, ".claude", "skills")) : [];
const skills = skillDirs.filter((dir) => {
  const file = join(ROOT, ".claude", "skills", dir, "SKILL.md");
  if (!existsSync(file)) return error("skills", `.claude/skills/${dir}`, "missing SKILL.md"), false;
  const fm = frontmatter(read(file));
  if (!fm) return error("skills", rel(file), "missing YAML frontmatter"), true;
  if (fm.name && fm.name !== dir) error("skills", rel(file), `name "${fm.name}" ≠ folder "${dir}"`);
  if (!fm.description) error("skills", rel(file), "description missing");
  if (fm.context === "fork" && fm.agent && !agents.includes(fm.agent) && !["Explore", "Plan", "general-purpose"].includes(fm.agent))
    error("skills", rel(file), `fork agent "${fm.agent}" does not exist`);
  return true;
});

// ---- references, paths and links across framework markdown --------------------------------
const markdown = [
  join(ROOT, "CLAUDE.md"),
  ...walk(join(ROOT, ".claude"), (f) => f.endsWith(".md") && !f.includes(`${sep}agent-memory`)),
  ...walk(join(ROOT, "tap26"), (f) => f.endsWith(".md") && !f.includes(`${sep}reports${sep}`) && !f.includes(`${sep}journal${sep}`) && !f.includes(`${sep}install${sep}claude${sep}`)),
  join(ROOT, "playwright", "README.md"),
].filter(existsSync);

const PATH_ROOTS = /^(tap26|\.claude|\.vscode|playwright|backend|src|data|cypress|scripts)\//;
// Created at runtime / per student — not expected to exist in a fresh checkout.
const RUNTIME_PATHS = /^(tap26\/reports\/|tap26\/memory\/(\.state|journal)|\.claude\/(settings\.local\.json|agent-memory)|playwright\/(test-results|playwright-report))/;
// Files and skills that docs/labs ask students to CREATE (examples, lab outputs).
const STUDENT_CREATED_IN = /^tap26\/(labs|templates)\//;
const EXAMPLE_SKILLS = new Set(["tap-smoke", "tap-i18n", "tap-flaky"]);
const EXAMPLE_PATHS = new Set([".claude/agents/i18n-tester.md", ".claude/skills/tap-i18n/SKILL.md", ".claude/hooks/no-hard-waits.mjs", "playwright/tests/api/security.api.spec.ts"]);
/** Exists exactly, or as a prefix of a sibling (e.g. `tap26/labs/lab-01` → lab-01-setup.md). */
const pathExists = (candidate) => {
  if (existsSync(join(ROOT, candidate))) return true;
  const dir = join(ROOT, dirname(candidate));
  const base = candidate.split("/").pop();
  return existsSync(dir) && readdirSync(dir).some((name) => name.startsWith(base));
};
const PLACEHOLDER = /[<>{}*$|…]|\.\.\.|NN|YYYY|###|<slug>/;
const slug = (heading) =>
  heading.trim().toLowerCase().replace(/[`*_~]/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s/g, "-");

const anchorsOf = (file) =>
  new Set(
    read(file)
      .replace(/```[\s\S]*?```/g, "")
      .split("\n")
      .filter((l) => /^#{1,6}\s/.test(l))
      .map((l) => slug(l.replace(/^#{1,6}\s+/, ""))),
  );

for (const file of markdown) {
  const text = read(file).replace(/^---[\s\S]*?\n---/, "");
  const where = rel(file);

  for (const [, name] of text.matchAll(/(?<![\w/.-])\/(tap-[a-z0-9-]*[a-z0-9])(?![\w<-])/g))
    if (!skills.includes(name) && !EXAMPLE_SKILLS.has(name))
      error("references", where, `unknown skill /${name}`);

  for (const [, name] of text.matchAll(/`([a-z][a-z0-9-]+)`\s+(?:sub)?agent\b/g))
    if (!agents.includes(name) && !["general-purpose", "explore", "plan"].includes(name)) error("references", where, `unknown agent \`${name}\``);

  for (const [, raw] of text.matchAll(/`([^`\s]+)`/g)) {
    const candidate = raw.replace(/[),.;:]+$/, "").replace(/:\d+(-\d+)?$/, "").replace(/#[A-Za-z][\w-]*$/, "");
    if (!PATH_ROOTS.test(candidate) || PLACEHOLDER.test(candidate) || RUNTIME_PATHS.test(candidate)) continue;
    if (STUDENT_CREATED_IN.test(where) || EXAMPLE_PATHS.has(candidate)) continue;
    if (!pathExists(candidate)) warn("paths", where, `referenced path not found: ${candidate}`);
  }

  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#$)/.test(target)) continue;
    const [pathPart, anchor] = target.split("#");
    const resolved = pathPart ? resolve(dirname(file), decodeURIComponent(pathPart)) : file;
    if (!existsSync(resolved)) {
      error("links", where, `broken link: ${target}`);
      continue;
    }
    if (anchor && resolved.endsWith(".md") && !anchorsOf(resolved).has(anchor.toLowerCase()))
      warn("links", where, `anchor not found: ${target}`);
  }
}

// ---- json & hooks ---------------------------------------------------------------------------
const jsonFiles = [
  ".claude/settings.json",
  ".vscode/settings.json",
  ".vscode/tasks.json",
  ".vscode/launch.json",
  ".vscode/extensions.json",
  "tap26/package.json",
  "tap26/openapi/openapi.json",
  "playwright/package.json",
  "playwright/tsconfig.json",
];
const parsed = Object.fromEntries(
  jsonFiles
    .filter((f) => existsSync(join(ROOT, f)))
    .map((f) => {
      try {
        return [f, JSON.parse(read(join(ROOT, f)))];
      } catch (e) {
        error("json", f, `invalid JSON: ${e.message}`);
        return [f, null];
      }
    }),
);

const hooks = parsed[".claude/settings.json"]?.hooks ?? {};
for (const [event, groups] of Object.entries(hooks))
  for (const group of groups)
    for (const hook of group.hooks ?? []) {
      const script = String(hook.command ?? "").match(/\.claude\/hooks\/[\w.-]+\.mjs/)?.[0];
      if (script && !existsSync(join(ROOT, script))) error("hooks", ".claude/settings.json", `${event}: missing ${script}`);
    }

// ---- report ---------------------------------------------------------------------------------
const errors = findings.filter((f) => f.level === "error");
const warnings = findings.filter((f) => f.level === "warn");
const summary = { agents: agents.length, skills: skills.length, markdownFiles: markdown.length, errors: errors.length, warnings: warnings.length };

if (args.has("--json")) {
  console.log(JSON.stringify({ summary, findings }, null, 2));
} else {
  console.log(`TAP26 framework check — ${summary.agents} agents · ${summary.skills} skills · ${summary.markdownFiles} markdown files`);
  for (const f of findings) console.log(`${f.level === "error" ? "✘" : "⚠"} [${f.area}] ${f.file}: ${f.message}`);
  console.log(errors.length || warnings.length ? `\n${errors.length} error(s), ${warnings.length} warning(s)` : "✔ all checks passed");
}
process.exit(errors.length || (args.has("--strict") && warnings.length) ? 1 : 0);
