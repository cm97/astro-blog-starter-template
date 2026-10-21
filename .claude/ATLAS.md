# Atlas (SWE-ATLAS) for Claude Code

The agents, slash commands and skills in this folder come from
[syahiidkamil/Software-Engineer-AI-Agent-Atlas](https://github.com/syahiidkamil/Software-Engineer-AI-Agent-Atlas)
(v2.6.4, commit `fc0bf11`). MIT licensed.

## What's here

- `agents/`: code-explorer, code-architect, code-review, code-simplifier, commit, qa-manual-tester
- `commands/`: `/plandev:feature`, `/plan:*`, `/brainstorm:*`, `/design:create-design-md`, `/qa:*`, `/git:*`, `/atlas:*`, `/start:be-fe`
- `skills/`: all Atlas skills. They sit beside this repo's own skills (error-explainer, grok-update-watcher, reverse-engineer-anything).

Good place to start: `/plandev:feature <what you want built>`.

## Left out on purpose

- **Atlas's `CLAUDE.md` and `misc/self/`.** The repo's own `CLAUDE.md` holds the live-site rules and still governs. Atlas's identity files would compete with it.
- **`.mcp.json`.** It points at a local Postgres and Playwright MCP. This site uses Cloudflare D1.
- **`hooks/`.** These are desktop sound and voice alerts, and no `settings.json` registers them.
- **`rules/DESIGN.md`.** It's an unfilled template that would load into every session. Run `/design:create-design-md` to make a real one.
- **`repos/`, `docs/`, `bin/`.** These are scaffolding for Atlas's own multi-repo setup.

Some commands mention "Boss Kamil" and folders such as `docs/decision_logs/` or `misc/prototypes/`. Those folders get created when a command first writes to them.
