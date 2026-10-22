#!/usr/bin/env node
/**
 * TAP26-Junior installer — copies the framework's editor/agent configuration into place:
 *   tap26/install/claude/  →  .claude/   (agents, skills, hooks, rules, output style, settings.json)
 *   tap26/install/vscode/  →  .vscode/   (tasks, launch configs, extension recommendations, settings)
 *
 * Why this exists: remote/automated tools may not write into .claude/ or .vscode/ on your machine
 * (those folders control what Claude and your editor may do), so you install them yourself, once —
 * after reviewing the bundle if you like.
 *
 * Usage (from the repo root):
 *   node tap26/install/install.mjs            # install; files you changed yourself are kept and reported
 *   node tap26/install/install.mjs --force    # also overwrite files that differ
 *   node tap26/install/install.mjs --dry-run  # show what would happen
 * Exit codes: 0 ok · 1 some files kept (re-run with --force to overwrite) · 2 bundle missing
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const BUNDLES = [
  { source: join(HERE, "claude"), target: join(ROOT, ".claude"), label: ".claude" },
  { source: join(HERE, "vscode"), target: join(ROOT, ".vscode"), label: ".vscode" },
];
/** Untouched originals shipped with the Real World App download — safe to upgrade without --force. */
const UPSTREAM_ORIGINALS = new Set([
  "9b88e65c5a66c7de16041090300f77600bebc927e3f5bbbc9f453cea907c2d71", // .vscode/launch.json
  "28ce07d6391a01b1a54ee291ebf277a8db88066d74b7133f835bc7e670471d64", // .vscode/settings.json
]);

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const dryRun = args.has("--dry-run");

const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const available = BUNDLES.filter((b) => existsSync(b.source));
if (!available.length) {
  console.error("TAP26 installer: no bundle found in tap26/install/ — nothing to install.");
  process.exit(2);
}

const plan = available.flatMap(({ source, target, label }) =>
  walk(source).map((from) => {
    const rel = relative(source, from).split(sep).join("/");
    const to = join(target, rel);
    const state = !existsSync(to)
      ? "new"
      : readFileSync(to).equals(readFileSync(from))
        ? "same"
        : UPSTREAM_ORIGINALS.has(sha256(to))
          ? "original"
          : "differs";
    return { display: `${label}/${rel}`, from, to, state };
  }),
);

const ACTION = { new: "created", original: "upgraded", same: "unchanged" };
const actions = plan.map((item) => {
  const write = item.state === "new" || item.state === "original" || (item.state === "differs" && force);
  if (write && !dryRun) {
    mkdirSync(dirname(item.to), { recursive: true });
    cpSync(item.from, item.to);
  }
  const action = ACTION[item.state] ?? (write ? "overwritten" : "KEPT (yours differs)");
  return { ...item, action };
});

const count = (a) => actions.filter((x) => x.action === a).length;
for (const a of actions.filter((x) => x.action !== "unchanged")) console.log(`${dryRun ? "[dry-run] " : ""}${a.action.padEnd(20)} ${a.display}`);
const kept = count("KEPT (yours differs)");
console.log(
  `\nTAP26 installer${dryRun ? " (dry run)" : ""}: ${count("created")} created · ${count("upgraded")} upgraded · ${count("overwritten")} overwritten · ${count("unchanged")} unchanged · ${kept} kept`,
);
if (kept) console.log("Some files differ from the bundle and were kept. Review them, then re-run with --force to overwrite.");
else if (!dryRun) {
  console.log("Done. Open a new Claude Code tab in VS Code (so agents, skills and hooks load) and reload the window for the tasks.");
  console.log("Verify: node tap26/scripts/check-framework.mjs --strict   ·   then type /tap-start in Claude Code.");
}
process.exit(kept ? 1 : 0);
