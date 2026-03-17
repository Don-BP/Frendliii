# MCP → CLI Conversion Design

**Date:** 2026-03-17
**Status:** Approved
**Goal:** Replace all active MCP server calls with lightweight CLI bash tools, achieving 80–90% token reduction per tool invocation without loss of functionality.

---

## Background

The Frendli project has three active MCP servers (context7, firebase, pinecone) and one CLI-ready service (github via `gh`). MCP calls cost 500–1000 tokens each; CLI calls cost 50–100 tokens each. The CLI framework already exists at `.claude/cli/` with 6 working tools, `jq` and `curl` installed, and a proven JSON I/O contract.

---

## Architecture

All new tools follow the existing contract:

```
Input (stdin):  {"action": "...", "params": {...}, "context": {...}}
Output (stdout): {"success": true|false, "data": ..., "error": ..., "metadata": {...}}
```

Tools source `.claude/cli/lib/utils.sh` for shared helpers (logging, error responses, JSON parsing).

MCP plugins remain enabled in Claude Code as a zero-cost fallback (deferred tools consume no tokens unless called). CLI tools are the preferred path.

---

## New Tools

### 1. `context7.sh` — Library Documentation Lookup

**Replaces:** `mcp__plugin_context7_context7__resolve-library-id`, `mcp__plugin_context7_context7__query-docs`
**Backend:** Context7 REST API via `curl`
**API base:** `https://context7.com/api`

| Action | Description | Key Params |
|--------|-------------|------------|
| `resolve-library` | Resolve a library name to a Context7 ID | `library_name` |
| `query-docs` | Fetch docs for a library | `library_id`, `topic?`, `tokens?` |
| `list` | List available actions | — |

**Secrets:** None required (public API).

---

### 2. `firebase.sh` — Firebase Project Operations

**Replaces:** Read/auth operations from `mcp__plugin_firebase_firebase__*` tools
**Scope:** Read operations only. Write-side MCP tools (`firebase_create_project`, `firebase_create_app`, `firebase_create_android_sha`, `firebase_init`, `firebase_update_environment`) are intentionally excluded — these are rare, human-supervised operations better performed via the `firebase` CLI directly or MCP fallback.
**Backend:** `firebase` CLI (v15.4.0, installed)
**Auth:** Requires an active `firebase login` session. `login` and `logout` actions are non-interactive: they print instructions and the current auth status rather than opening a browser. Use `firebase login --no-localhost` manually for initial setup, or set `FIREBASE_TOKEN` env var for CI.

| Action | Description | Key Params |
|--------|-------------|------------|
| `list-projects` | List all Firebase projects | — |
| `get-project` | Get a specific project | `project_id` |
| `list-apps` | List apps in a project | `project_id` |
| `get-sdk-config` | Get SDK config for an app | `project_id`, `app_id` |
| `get-security-rules` | Get Firestore/RTDB security rules | `project_id`, `service?` (firestore|database) |
| `get-environment` | Get project environment info | `project_id` |
| `auth-status` | Show current login status | — |
| `list` | List available actions | — |

**Output:** Firebase CLI JSON output is captured and wrapped in the standard response envelope. Non-JSON output (warnings, progress lines) is stripped before wrapping.

---

### 3. `pinecone.sh` — Vector Database Operations

**Replaces:** Query/data operations from `mcp__plugin_pinecone_pinecone__*` tools
**Scope:** All search, upsert, describe, and rerank operations. `create-index-for-model` is intentionally excluded — index creation is a rare, human-supervised operation; use MCP or Pinecone console directly.
**Backend:** Pinecone REST API v1 via `curl`
**API base:** `https://api.pinecone.io`

| Action | Description | Key Params |
|--------|-------------|------------|
| `list-indexes` | List all indexes | — |
| `describe-index` | Describe a specific index | `index_name` |
| `describe-stats` | Get index statistics | `index_name`, `namespace?` |
| `search-records` | Search by text query (requires integrated inference model on the index) | `index_name`, `query`, `top_k?`, `namespace?`, `filter?` |
| `upsert-records` | Upsert records into index | `index_name`, `records` (JSON array), `namespace?` |
| `cascading-search` | Multi-namespace cascading search | `index_name`, `query`, `namespaces` (JSON array) |
| `rerank` | Rerank documents by relevance | `query`, `documents` (JSON array), `model?`, `top_n?` |
| `list` | List available actions | — |

**Note on `search-records`:** Text-based search (`query` param) requires the target index to use an integrated embedding model (e.g., `multilingual-e5-large`). For standard vector indexes, pass a `query_vector` (float array) instead of `query`.

**Secrets:** `~/.claude/secrets/pinecone-api-key` (loaded via `load_secret "pinecone-api-key"`)

---

### 4. `github.sh` — GitHub Operations

**Replaces:** Manual `gh` invocations scattered across agent sessions
**Backend:** `gh` CLI (installed)
**Auth:** Uses existing `gh auth login` session.

| Action | Description | Key Params |
|--------|-------------|------------|
| `pr-list` | List pull requests | `state?`, `limit?` |
| `pr-view` | View a pull request | `pr_number` |
| `pr-create` | Create a pull request | `title`, `body`, `base?` |
| `issue-list` | List issues | `state?`, `limit?` |
| `issue-view` | View an issue | `issue_number` |
| `run-list` | List workflow runs | `limit?` |
| `run-view` | View a workflow run | `run_id` |
| `list` | List available actions | — |

---

## Files Changed

| File | Change |
|------|--------|
| `.claude/cli/tools/context7.sh` | **Create** — new tool |
| `.claude/cli/tools/firebase.sh` | **Create** — new tool |
| `.claude/cli/tools/pinecone.sh` | **Create** — new tool |
| `.claude/cli/tools/github.sh` | **Create** — new tool |
| `.agent-rules/04-cli-tools.md` | **Update** — add 4 new tools to reference |
| `.claude/cli/README.md` | **Update** — add new tools to built-in list |
| `Global_Manifest.md` | **Update** — register new tools |
| `ANTIGRAVITY.md` | **Update** — note MCP→CLI migration |

**Post-creation step:** Run `chmod +x .claude/cli/tools/*.sh` after creating new tool files (required on Windows/Git Bash for executable bit).

---

## Security

- API keys loaded from `~/.claude/secrets/` only — never hardcoded
- Tool inputs validated with `jq` before use
- Sensitive response fields not logged to stderr
- Firebase and GitHub use existing authenticated CLI sessions

---

## Testing

Each tool verified with:
```bash
echo '{"action": "list", "params": {}}' | bash .claude/cli/tools/<tool>.sh
```

Plus one live action per tool to confirm real API connectivity.

---

## Token Savings Summary

| MCP | Calls/session (est.) | Tokens saved/call | Total savings |
|-----|---------------------|------------------|---------------|
| context7 | 5–10 | ~700 | ~4,900 tokens |
| firebase | 3–5 | ~700 | ~2,800 tokens |
| pinecone | 5–15 | ~700 | ~7,000 tokens |
| github | 5–10 | ~700 | ~4,900 tokens |
| **Total** | | | **~19,600 tokens/session** |

At ~$0.003/1K tokens (Sonnet), this is ~$0.06 saved per session — but the real benefit is reduced context window pressure, faster responses, and simpler debugging.
