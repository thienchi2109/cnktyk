# GEMINI.md - AI Assistant Guide for CNKTYKLT Platform

**Last Updated:** November 22, 2025

This document provides comprehensive guidance for Gemini AI assistants working with the CNKTYKLT Compliance Management Platform. It is based on `CLAUDE.md` and `AGENTS.md`.

## 1. Project Overview

**CNKTYKLT Compliance Management Platform** is a healthcare compliance tracking system for managing Continuing Professional Development (CPD) credits for Vietnamese healthcare practitioners. The platform tracks activities, approvals, and 5-year cycle compliance across the Department of Health and healthcare units.

### User Roles
1. **SoYTe** (Department of Health) - Full system access across all units
2. **DonVi** (Unit Admin) - Access to their unit's data only
3. **NguoiHanhNghe** (Practitioner) - Access to own activity records
4. **Auditor** - Read-only access for compliance auditing

## 2. Technology Stack

- **Core**: Next.js 15.5.4 (App Router), React 19.1.0, TypeScript 5, Node.js 18+
- **Database**: Neon PostgreSQL (serverless) via `@neondatabase/serverless`
- **Storage**: Cloudflare R2 (AWS SDK v3 compatible)
- **Auth**: NextAuth.js v5 (beta) with JWT sessions
- **State**: TanStack Query v5, React Hook Form
- **UI**: TailwindCSS 4.0, glasscn-ui, Radix UI, Lucide React
- **Testing**: Vitest, Playwright (future)
- **Deployment**: Cloudflare Workers + Pages (Primary), Vercel (Fallback)

## 3. Development Workflow

### Startup Sequence
1. **Bootstrap Superpowers**: Run `~/.codex/superpowers/.codex/superpowers-codex bootstrap` (or `node ...` in WSL) at the start of the session.
2. **Environment**: Ensure `.env` is configured (copy from `.env.example`).

### Task Execution
1. **Plan**: Use `write_todos` for multi-step tasks.
2. **Spec**: Check `openspec/` for requirements.
3. **Implement**: Follow project conventions.
4. **Verify**: Run tests and type checks.

## 4. Code Conventions

### TypeScript & Naming
- **Strict Mode**: No `any` types. Explicit return types.
- **Components**: PascalCase (`UserProfile`). "use client" for client components.
- **Functions/Variables**: camelCase (`getUserData`).
- **Files**: kebab-case (`user-profile.tsx`).
- **Database Columns**: PascalCase (Vietnamese names, e.g., `TenDangNhap`).
- **Imports**: Use `@/*` aliases. External libraries first.

### Database Interactions
- **Repositories**: ALWAYS use repositories in `lib/db/repositories`. NEVER write raw SQL in components.
- **Parameterized Queries**: ALWAYS use `$1`, `$2`, etc. to prevent SQL injection.
- **Validation**: Use Zod schemas (`lib/db/schemas.ts`) for all inputs.

### Security
- **Tenant Isolation**: ALWAYS enforce `WHERE "MaDonVi" = session.user.unitId` for `DonVi` role.
- **Passwords**: Use `bcryptjs` (Workers compatible).
- **Audit Logging**: Log all mutations to `NhatKyHeThong`.

## 5. Git Workflow (Conventional Commits)

Format: `<type>: <subject>`

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation
- **refactor**: Code restructuring (no feature/bug change)
- **style**: Formatting only
- **test**: Adding/updating tests
- **chore**: Tooling/config updates
- **perf**: Performance improvements

**Subject**: Imperative mood, present tense, under 100 chars.
*Example*: `fix: Correct login logic for admin user`

## 6. OpenSpec Workflow

- **Proposals**: Create in `openspec/changes/[change-id]/` for new features, breaking changes, or architecture shifts.
- **Validation**: Run `openspec validate` before implementation.
- **Implementation**: Follow the tasks in the proposal.
- **Archive**: Move to `openspec/archive/` after deployment.

## 7. Common Commands

| Action | Command |
| :--- | :--- |
| **Dev Server** | `npm run dev` |
| **Build** | `npm run build` |
| **Type Check** | `npm run typecheck` |
| **Lint** | `npm run lint` (Skip after tasks unless requested) |
| **Test All** | `npm run test` |
| **Test File** | `npm run test -- path/to/file` |
| **DB Test** | `npx tsx scripts/test-complete-system.ts` |
| **Deploy Prod** | `npm run deploy:production` |

## 8. Key File Locations

- **Config**: `next.config.ts`, `middleware.ts`, `wrangler.toml`
- **DB Layer**: `lib/db/` (Client, Repositories, Schemas)
- **API**: `src/app/api/`
- **Components**: `src/components/`
- **Docs**: `docs/`, `openspec/`, `CLAUDE.md`

## 9. Feature Flags & Deployment

- Managed in `.env` and `src/lib/features/flags.ts`.
- Primary target: Cloudflare Workers (Use edge-compatible libraries).

---
**Note**: This file is a summary. For detailed procedures, refer to `CLAUDE.md`.
