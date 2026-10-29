#!/usr/bin/env node
/**
 * TAP26-Junior shared-memory CLI (zero dependencies, cross-platform).
 *
 * Keeps every memory file in one consistent format so humans and agents can read,
 * append and search it safely. Agents call this instead of hand-editing memory files.
 *
 * Usage:
 *   node tap26/scripts/memory.mjs digest                      # rebuild MEMORY.md and print it
 *   node tap26/scripts/memory.mjs show [file]                 # print a memory file (default MEMORY.md)
 *   node tap26/scripts/memory.mjs search <text>               # grep across memory
 *   node tap26/scripts/memory.mjs add-fact <area> <text> [--by agent]
 *   node tap26/scripts/memory.mjs add-learning <title> --lesson "<text>" [--what "<text>"] [--tags a,b] [--applies agentA,skillB] [--by agent]
 *   node tap26/scripts/memory.mjs add-decision <title> --context "<t>" --decision "<t>" [--consequences "<t>"] [--by agent]
 *   node tap26/scripts/memory.mjs add-question <text> [--by agent]
 *   node tap26/scripts/memory.mjs answer <Q-id> <answer text> [--by agent]
 *   node tap26/scripts/memory.mjs log-change <file> <summary> [--by agent]
 *   node tap26/scripts/memory.mjs journal <text> [--by agent]
 *   node tap26/scripts/memory.mjs set-active <text>            # replace the "Active work" section
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MEM = join(ROOT, "tap26", "memory");
const file = (name) => join(MEM, name);

/** Local wall-clock time "YYYY-MM-DD HH:MM" (memory is read by humans in their own timezone). */
const now = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const today = () => now().slice(0, 10);

const read = (name) => (existsSync(file(name)) ? readFileSync(file(name), "utf8") : "");
const write = (name, text) => {
  mkdirSync(dirname(file(name)), { recursive: true });
  writeFileSync(file(name), text);
};
const append = (name, text) => {
  mkdirSync(dirname(file(name)), { recursive: true });
  appendFileSync(file(name), text.endsWith("\n") ? text : `${text}\n`);
};

/** Parse `--flag value` pairs; remaining tokens are positionals. */
const parseArgs = (argv) =>
  argv.reduce(
    (acc, token, i, all) => {
      if (acc.skip) return { ...acc, skip: false };
      if (token.startsWith("--")) return { ...acc, flags: { ...acc.flags, [token.slice(2)]: all[i + 1] ?? "" }, skip: true };
      return { ...acc, positionals: [...acc.positionals, token] };
    },
    { positionals: [], flags: {}, skip: false },
  );

const nextId = (text, prefix) => {
  const ids = [...text.matchAll(new RegExp(`${prefix}-(\\d+)`, "g"))].map((m) => Number(m[1]));
  return `${prefix}-${String((ids.length ? Math.max(...ids) : 0) + 1).padStart(3, "0")}`;
};

const by = (flags) => flags.by || process.env.TAP26_AGENT || "student";

// ---- commands ----------------------------------------------------------------

const addFact = ({ positionals: [area, ...rest], flags }) => {
  if (!area || !rest.length) throw new Error("usage: add-fact <area> <text>");
  append("facts.md", `- [${area}] ${rest.join(" ")} (verified ${today()} by ${by(flags)})`);
  return `fact added to facts.md`;
};

const addLearning = ({ positionals, flags }) => {
  const title = positionals.join(" ");
  if (!title || !flags.lesson) throw new Error('usage: add-learning <title> --lesson "<text>"');
  const id = nextId(read("learnings.md"), "L");
  append(
    "learnings.md",
    [
      ``,
      `## ${id} ${title}`,
      `- Tags: ${flags.tags || "general"}`,
      `- What happened: ${flags.what || "n/a"}`,
      `- Lesson: ${flags.lesson}`,
      `- Applies to: ${flags.applies || "all"}`,
      `- Date: ${today()} · Source: ${by(flags)}`,
    ].join("\n"),
  );
  return `${id} added to learnings.md`;
};

const addDecision = ({ positionals, flags }) => {
  const title = positionals.join(" ");
  if (!title || !flags.context || !flags.decision)
    throw new Error('usage: add-decision <title> --context "<t>" --decision "<t>"');
  const id = nextId(read("decisions.md"), "D");
  append(
    "decisions.md",
    [
      ``,
      `## ${id} ${title}`,
      `- Context: ${flags.context}`,
      `- Decision: ${flags.decision}`,
      `- Consequences: ${flags.consequences || "n/a"}`,
      `- Date: ${today()} · By: ${by(flags)}`,
    ].join("\n"),
  );
  return `${id} added to decisions.md`;
};

const addQuestion = ({ positionals, flags }) => {
  const text = positionals.join(" ");
  if (!text) throw new Error("usage: add-question <text>");
  const id = nextId(read("open-questions.md"), "Q");
  append("open-questions.md", `- [ ] ${id} ${text} (asked by ${by(flags)}, ${today()})`);
  return `${id} added to open-questions.md`;
};

const answer = ({ positionals: [id, ...rest], flags }) => {
  const text = read("open-questions.md");
  if (!id || !text.includes(id)) throw new Error(`question ${id} not found`);
  const updated = text
    .split("\n")
    .map((line) =>
      line.includes(` ${id} `) && line.startsWith("- [ ]")
        ? `${line.replace("- [ ]", "- [x]")}\n  - Answer: ${rest.join(" ")} (${by(flags)}, ${today()})`
        : line,
    )
    .join("\n");
  write("open-questions.md", updated);
  return `${id} answered`;
};

const logChange = ({ positionals: [target, ...rest], flags }) => {
  if (!target) throw new Error("usage: log-change <file> <summary>");
  append("changes.md", `- ${now()} | ${target} | ${rest.join(" ") || "edit"} | ${by(flags)}`);
  return "change logged";
};

const journal = ({ positionals, flags }) => {
  append(join("journal", `${today()}.md`), `- ${now().slice(11)} [${by(flags)}] ${positionals.join(" ")}`);
  return "journal updated";
};

// ---- digest --------------------------------------------------------------------

const section = (text, heading) => {
  const match = text.match(new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`));
  return match ? match[1].trim() : "";
};

const lastBlocks = (text, prefix, count) =>
  text
    .split(/\n(?=## )/)
    .filter((block) => block.startsWith(`## ${prefix}-`))
    .slice(-count)
    .map((block) => {
      const [title, ...lines] = block.split("\n");
      const lesson = lines.find((l) => l.startsWith("- Lesson:") || l.startsWith("- Decision:")) || "";
      return `- ${title.replace("## ", "")} — ${lesson.replace(/^- (Lesson|Decision): /, "")}`;
    });

const digest = () => {
  const previous = read("MEMORY.md");
  const active = section(previous, "Active work") || "- (none recorded — use `memory.mjs set-active`)";
  const facts = read("facts.md").split("\n").filter((l) => l.startsWith("- ")).slice(-25);
  const conventions = section(previous, "Conventions") || "- See CLAUDE.md and tap26/knowledge/conventions.md";
  const questions = read("open-questions.md").split("\n").filter((l) => l.startsWith("- [ ]")).slice(-5);
  const changes = read("changes.md").split("\n").filter((l) => l.startsWith("- ")).slice(-8);
  const text = [
    `# TAP26-Junior memory digest`,
    ``,
    `> Auto-generated by \`node tap26/scripts/memory.mjs digest\` on ${now()}. Imported by CLAUDE.md, so every session starts with it.`,
    `> Full files: facts.md · learnings.md · decisions.md · changes.md · open-questions.md · glossary.md · journal/`,
    ``,
    `## Project facts`,
    ...(facts.length ? facts : ["- (none yet)"]),
    ``,
    `## Conventions`,
    conventions,
    ``,
    `## Active work`,
    active,
    ``,
    `## Recent decisions`,
    ...(lastBlocks(read("decisions.md"), "D", 5).length ? lastBlocks(read("decisions.md"), "D", 5) : ["- (none yet)"]),
    ``,
    `## Recent learnings`,
    ...(lastBlocks(read("learnings.md"), "L", 10).length ? lastBlocks(read("learnings.md"), "L", 10) : ["- (none yet)"]),
    ``,
    `## Recent app changes (ledger)`,
    ...(changes.length ? changes : ["- (none yet)"]),
    ``,
    `## Open questions`,
    ...(questions.length ? questions : ["- (none)"]),
    ``,
  ].join("\n");
  write("MEMORY.md", text);
  return text;
};

const setActive = ({ positionals }) => {
  const previous = read("MEMORY.md") || digest();
  const body = positionals.join(" ");
  const updated = previous.match(/## Active work\n/)
    ? previous.replace(/## Active work\n[\s\S]*?(?=\n## )/, `## Active work\n- ${body} (${today()})\n`)
    : `${previous}\n## Active work\n- ${body} (${today()})\n`;
  write("MEMORY.md", updated);
  return "active work updated";
};

/** Only files inside tap26/memory may be shown (blocks `show ../../.env`-style path escapes). */
const insideMemory = (name) => !isAbsolute(name) && !name.split(/[\\/]/).includes("..");

const show = ({ positionals: [name = "MEMORY.md"] }) => {
  if (!insideMemory(name)) throw new Error("show only reads files inside tap26/memory");
  return read(name) || `(empty: ${name})`;
};

const search = ({ positionals }) => {
  const needle = positionals.join(" ").toLowerCase();
  if (!needle) throw new Error("usage: search <text>");
  const files = [
    ...readdirSync(MEM).filter((f) => f.endsWith(".md")),
    ...(existsSync(file("journal")) ? readdirSync(file("journal")).map((f) => join("journal", f)) : []),
  ];
  const hits = files.flatMap((f) =>
    read(f)
      .split("\n")
      .map((line, i) => ({ f, i, line }))
      .filter(({ line }) => line.toLowerCase().includes(needle))
      .map(({ f, i, line }) => `${f}:${i + 1}: ${line.trim()}`),
  );
  return hits.length ? hits.join("\n") : "no matches";
};

const commands = {
  digest,
  show,
  search,
  "add-fact": addFact,
  "add-learning": addLearning,
  "add-decision": addDecision,
  "add-question": addQuestion,
  answer,
  "log-change": logChange,
  journal,
  "set-active": setActive,
};

const [command, ...rest] = process.argv.slice(2);
if (!command || !commands[command]) {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
  process.exit(command ? 1 : 0);
}
try {
  console.log(commands[command](parseArgs(rest)));
} catch (error) {
  console.error(`memory.mjs: ${error.message}`);
  process.exit(1);
}
