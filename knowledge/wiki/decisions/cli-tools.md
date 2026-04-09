---
title: CLI Tools
tags: [cli, frendli-api, db-inspect, typecheck, prisma]
sources: [CC-Session-Logs/01-04-2026-full-plan-audit-and-fixes.md]
updated: 2026-04-09
---

# CLI Tools

Four Frendli-specific CLI tools in `.claude/cli/tools/`. All follow the existing framework pattern: source `lib/utils.sh`, accept JSON via stdin, return `success_response` / `error_response`.

## Usage Pattern

```bash
echo '{"action":"get","params":{"route":"/api/hangouts/my"}}' | bash .claude/cli/tools/frendli-api.sh
```

## Tools

### frendli-api.sh

Test API routes with mock auth (`x-mock-user-id` header).

Actions: `get` / `post` / `patch` / `delete` / `list`

Default test user: `00000000-0000-0000-0000-000000000001`

### db-inspect.sh

Query PostgreSQL via Docker.

Actions: `stats` / `users` / `hangouts` / `matches` / `waves` / `user` / `venue`

### typecheck.sh

Run `tsc --noEmit` across packages.

Actions: `both` / `api` / `app` / `watch`

### prisma-ops.sh

Prisma database operations.

Actions: `migrate` / `generate` / `push` / `reset` / `seed` / `studio` / `status`

**`reset` requires `"confirm": true`** in the input JSON — returns `CONFIRMATION_REQUIRED` error otherwise. Agent-safe: no interactive prompts.

## Notes

- `00-orchestrator.md` has a FRENDLI-SPECIFIC TOOL USAGE section documenting these tools.
- `ANTIGRAVITY.md` is the project integration map (rewritten from generic template on 01-04-2026).
