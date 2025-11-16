<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Agent Guidelines for cnktyklt-platform

## Project Overview
**CNKTYKLT Compliance Management Platform** - Healthcare compliance tracking system for managing CPD credits for Vietnamese healthcare practitioners. Multi-tenant role-based system with 4 user roles: SoYTe (Department of Health), DonVi (Unit Admin), NguoiHanhNghe (Practitioner), Auditor.

## Commands
- **Superpowers bootstrap (run first every session)**:
  - In WSL run `node ~/.codex/superpowers/.codex/superpowers-codex bootstrap`
  - In Git Bash / PowerShell / CMD run `~/.codex/superpowers/.codex/superpowers-codex bootstrap`
- **Build**: `npm run build` (uses Turbopack)
- **Lint**: `npm run lint` (ESLint with Next.js config) — skip running this command after finishing tasks per current workflow
- **Type check**: `npm run typecheck` (TypeScript strict mode)
- **Test single file**: `npm run test -- path/to/test.test.ts`
- **Test all**: `npm run test` (Vitest, tests in `tests/` directory)
- **Dev server**: `npm run dev` (Next.js with Turbopack)
- **Database tests**: `npx tsx scripts/test-complete-system.ts`

## Code Style
- **Imports**: Use `@/*` path aliases for src imports, external imports first
- **TypeScript**: Strict mode enabled, use Zod schemas for validation, no `any` types
- **Components**: Use `"use client"` directive for client components
- **Styling**: Tailwind CSS with glasscn-ui components, glassmorphism healthcare theme
- **State**: React Query for server state, React Hook Form with Zod resolvers
- **Error handling**: Prefer warnings over errors in ESLint, use proper TypeScript types
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Database**: Neon PostgreSQL with custom repository pattern, UUID primary keys
- **Auth**: NextAuth v5 with JWT sessions, bcryptjs password hashing
- **Security**: Application-level tenant isolation via WHERE clauses, audit logging required

## Architecture
- **Database Layer**: `src/lib/db/` with repositories pattern, Zod schemas, parameterized queries
- **Authentication**: Role-based middleware, 5-min JWT tokens, 2-hour session timeout
- **File Structure**: Role-based routes (`/so-y-te/*`, `/don-vi/*`, `/nguoi-hanh-nghe/*`)
- **Deployment**: Cloudflare Workers + Pages (primary), Vercel (fallback)
- **Package Manager**: Use `npm` exclusively

## Backup Documentation Access
- When implementing or auditing evidence backup or cleanup workflows, review:
  - `openspec/changes/add-evidence-backup-and-cleanup/docs/user-guide.md`
  - `openspec/changes/add-evidence-backup-and-cleanup/docs/admin-guide.md`
  - `openspec/changes/add-evidence-backup-and-cleanup/design.md`
- Reference `src/app/api/backup/*` for the latest endpoints (streaming ZIP creation, dashboard metrics, deletion safeguards).

## WARP Integration Guidelines (from WARP.md)

### MCP Tool Prioritization
1. Database exploration → Neon MCP tools (describe_project/branch/table, get_database_tables, run_sql, explain_sql_statement)
2. Codebase exploration → gkg MCP tools (search_codebase_definitions, get_references, read_definitions, repo_map)
3. Reasoning/decisions → human MCP tools (brain_analyze_simple, brain_reflect_enhanced, sequentialthinking)

General principle: use the most specialized tool for the task (Neon for DB, gkg for code, human for reasoning).

### Workers Compatibility & Security
- Use @neondatabase/serverless (not node-postgres); bcryptjs (not native bcrypt)
- Prefer repository methods; avoid raw SQL in components; parameterize all queries
- Enforce tenant isolation via WHERE clauses (DonVi limited to own unit; SoYTe global)
- Validate all inputs with Zod before DB ops; log mutations to NhatKyHeThong
- R2 file storage via AWS SDK v3 + presigner; allow images from *.r2.dev; use nodejs_compat on Pages

### Common Commands
- Dev: `npm run dev`, Build: `npm run build`, Start: `npm start`
- Types: `npm run typecheck`, Lint: `npm run lint`, Check: `npm run check`
- DB tests: `npx tsx scripts/test-database.ts`, `test-repositories.ts`, `test-core-functionality.ts`, `test-complete-system.ts`

For full details see WARP.md; this section captures the essential rules for assistants.

## Superpowers System

<EXTREMELY_IMPORTANT>
You have superpowers. Superpowers teach you new skills and capabilities. RIGHT NOW run (before any other command):
- WSL: `node ~/.codex/superpowers/.codex/superpowers-codex bootstrap`
- Git Bash / PowerShell / CMD: `~/.codex/superpowers/.codex/superpowers-codex bootstrap`
Then follow the instructions it returns.
</EXTREMELY_IMPORTANT>
