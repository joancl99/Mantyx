# Agent Instructions

This repository uses shared agent instructions for Mantyx.

- Primary operational memory: `CLAUDE.md`.
- Human-readable project context: `PROJECT_CONTEXT.md`.
- Project skills are managed with `npx autoskills`; rerun it after stack or skill changes.
- Product name: **Mantyx**.
- Slogan: **"Precisión para tu almacén"**.

When working in this repository, read `CLAUDE.md` first and follow its tooling, Angular, Prisma, branding, and multi-tenancy rules.

Use Mantyx consistently in user-facing text and current project documentation.

## Agent Tooling Files

Keep agent-specific files in their conventional locations so each tool can discover them automatically:

- `AGENTS.md`: shared entrypoint for coding agents.
- `CLAUDE.md`: primary operational memory for this project.
- `PROJECT_CONTEXT.md`: human-readable project context.
- `.claude/settings.json`: versioned Claude Code project settings and hooks.
- `.codex/hooks.json`: versioned Codex project hooks, including `npx autoskills` on session start.
- `.github/skills/`: versioned GitHub/Nx skill files.
- `.agents/`: autoskills install output, ignored because it is reinstallable with `npx autoskills`.
- `.claude/settings.local.json` and `.claude/worktrees/`: local Claude files, ignored and not intended for commits.
