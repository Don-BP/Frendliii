# Global Project Manifest

*System Instruction: This is the Source of Truth for active files. Update this when creating new assets, or before major changes.*

## System Files (Do Not Touch Without Reason)

These files define the system architecture and should rarely change:

- **AGENTS.md** / **ANTIGRAVITY.md**: Master Architecture & Project Structure
- **Global_Manifest.md**: This file (source of truth for active files)
- **.agent/rules/***: Cognitive Architecture (Orchestrator, Research, B.L.A.S.T., CLI Tools)
- **.env**: Secrets and environment variables (Never commit to repo)
- **.gitignore**: Files to exclude from version control

## Active Directives (Layer 1 - Planning)

Track all active work in progress:

| Date | Task Name | Status | Owner | Due Date | Notes |
|:---|:---|:---|:---|:---|:---|
| YYYY-MM-DD | [Task Name] | [Pending/Active/Done] | [Person/Agent] | [Date] | [Brief description] |

Example:
| 2026-03-16 | Add authentication | Active | Alice | 2026-03-20 | Using JWT tokens |
| 2026-03-16 | Database optimization | Pending | Bob | 2026-03-25 | Waiting for schema review |

## Active Skills (Layer 2 - Capabilities)

List skills that are actively used by agents:

| Skill Name | Location | Purpose | Last Used | Status |
|:---|:---|:---|:---|:---|
| `webapp-testing-enhanced` | `.agent/skills/` | E2E testing with Playwright | [Date] | Active |
| `security-auditing` | `.agent/skills/` | Code security scanning | [Date] | Active |
| `api-integration` | `.agent/skills/` | API integration patterns | [Date] | Active |

## Active Execution Tools (Layer 3 - Implementation)

Track all scripts and tools that are actively maintained:

| Script Path | Purpose | Language | Last Verified | Owner | Status |
|:---|:---|:---|:---|:---|:---|
| `.claude/cli/tools/http-client.sh` | HTTP requests | Bash | [Date] | [Person] | ✅ Production |
| `.claude/cli/tools/json-processor.sh` | JSON transformation | Bash | [Date] | [Person] | ✅ Production |
| `tools/verify_browser.py` | UI Verification | Python | [Date] | [Person] | ✅ Testing |
| `.claude/cli/tools/context7.sh` | Context7 docs lookup | Bash | 2026-03-17 | Claude | ✅ Production |
| `.claude/cli/tools/firebase.sh` | Firebase read ops | Bash | 2026-03-17 | Claude | ✅ Production |
| `.claude/cli/tools/pinecone.sh` | Pinecone vector DB ops | Bash | 2026-03-17 | Claude | ✅ Production |
| `.claude/cli/tools/github.sh` | GitHub PR/issue/CI ops | Bash | 2026-03-17 | Claude | ✅ Production |

## Project Dependencies

External services and API integrations:

| Service | Purpose | API Version | Rate Limit | Status | Owner |
|:---|:---|:---|:---|:---|:---|
| OpenAI API | LLM inference | v1 | 3,500 RPM | ✅ Active | [Person] |
| PostgreSQL | Database | 15.0 | N/A | ✅ Active | DevOps |
| Firebase Auth | Authentication | v9 | Unlimited | ✅ Active | [Person] |
| Pinecone | Vector search | REST v1 | Per plan | ✅ Active (CLI) | Claude |
| Firebase | Project config | CLI v15 | N/A | ✅ Active (CLI) | Claude |
| Context7 | Docs lookup | REST v1 | Public | ✅ Active (CLI) | Claude |

## Database Schema Version

Current state of data models:

- **Schema Version:** v1.0.0
- **Last Migration:** 2026-03-16 (Added users table)
- **Next Planned:** v1.1.0 (Add projects table)
- **Backup Schedule:** Daily at 00:00 UTC

## Deployment Status

Where is the code running:

| Environment | Branch | Last Deploy | Status | Notes |
|:---|:---|:---|:---|:---|
| Development | `main` | [Date] | ✅ Healthy | Running on localhost |
| Staging | `staging` | [Date] | ✅ Healthy | Test environment |
| Production | `release-*` | [Date] | ✅ Healthy | 99.9% uptime |

## Known Debt & Issues

Technical debt that needs attention:

| Issue | Component | Severity | Owner | Estimated Fix Time |
|:---|:---|:---|:---|:---|
| [Issue] | [Component] | [Critical/High/Medium/Low] | [Person] | [e.g., 4 hours] |

## Critical Contacts

Who to reach for what:

- **Architecture Questions:** [Person Name] ([slack handle])
- **Database Issues:** [Person Name] ([slack handle])
- **Deployment:** [Person Name] ([slack handle])
- **On-Call Emergency:** [Person Name] ([phone/slack])

## Recent Changes Log

Track what's changed recently:

| Date | What Changed | Why | Who | Impact |
|:---|:---|:---|:---|:---|
| 2026-03-16 | Added B.L.A.S.T. Protocol | Better project management | Claude | Training required |

---

## Update Instructions

**When to update this file:**
- ✅ Adding a new tool or script
- ✅ Changing deployment status
- ✅ Adding a new external service integration
- ✅ Changing team responsibilities
- ✅ Discovering critical debt

**When NOT to update this file:**
- ❌ Minor bug fixes
- ❌ Documentation updates
- ❌ Code style changes
- ❌ Refactoring without external impact

**This is your single source of truth. Keep it current!**
