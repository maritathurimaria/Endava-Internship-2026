# Installing TAP26-Junior's Claude Code and VS Code configuration

Two transport bundles, installed by one command:

- `tap26/install/claude/` → `.claude/`: 24 agents, 31 skills, 6 hooks, 5 rules, the TAP26 Mentor
  output style and `settings.json` (permissions + hook wiring).
- `tap26/install/vscode/` → `.vscode/`: `tasks.json` ("TAP: …" tasks), `launch.json` (debug configs),
  `extensions.json` (recommended extensions) and `settings.json`.

Run once from the repository root:

```bash
node tap26/install/install.mjs --dry-run   # preview
node tap26/install/install.mjs             # install into .claude/
```

Then open a new Claude Code tab in VS Code (so the agents, skills and hooks load), reload the window
(*Developer: Reload Window*) so the tasks appear, run
`node tap26/scripts/check-framework.mjs --strict` and type `/tap-start`.

- Untouched originals from the app download (`.vscode/launch.json`, `.vscode/settings.json`) are upgraded
  automatically. Any other existing file with different content is **kept** and reported; re-run with
  `--force` to overwrite.
- Your personal `.claude/settings.local.json` and `.claude/agent-memory/` are never touched.
- After installing, `.claude/` is the source of truth; this bundle is only a transport copy
  (it is gitignored). To refresh it, copy `.claude/` and `.vscode/` back over `tap26/install/claude/` and `tap26/install/vscode/`.
