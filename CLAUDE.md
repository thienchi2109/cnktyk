# CLAUDE.md - AI Assistant Guide for CNKTYKLT Platform

**Last Updated:** 2025-11-14

Comprehensive guidance for AI assistants working on the CNKTYKLT Compliance Management Platform (healthcare CPD tracking for Vietnamese practitioners).

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Repository Structure](#repository-structure)
4. [Development Workflow](#development-workflow)
5. [Git & Commits](#git--commits)
6. [Code Conventions](#code-conventions)
7. [Architecture](#architecture)
8. [Database Operations](#database-operations)
9. [API Development](#api-development)
10. [Security](#security)
11. [OpenSpec Workflow](#openspec-workflow)
12. [Feature Flags](#feature-flags)
13. [Deployment](#deployment)
14. [Quick Reference](#quick-reference)

---

## Project Overview

**CNKTYKLT Platform** - Healthcare compliance tracking system for Continuing Professional Development (CPD) credits across Department of Health and healthcare units.

### User Roles
- **SoYTe** - Full system access
- **DonVi** - Unit-level access only
- **NguoiHanhNghe** - Own records only
- **Auditor** - Read-only access

### Key Features
Practitioner management, activity submission/approval, RBAC with middleware, R2 file storage, evidence backup center, audit logging, 5-year compliance tracking, glassmorphism UI.

---

## Technology Stack

| Category | Tools |
|----------|-------|
| **Framework** | Next.js 15.5.4 (App Router, Turbopack), React 19.1.0, TypeScript 5 (strict) |
| **Database** | Neon PostgreSQL via `@neondatabase/serverless`, Cloudflare R2 storage |
| **Auth** | NextAuth.js v5 (JWT, bcryptjs, 5min token/2hr session) |
| **State** | TanStack Query v5, React Hook Form + Zod |
| **UI** | TailwindCSS 4.0, glasscn-ui, Radix UI, Lucide React |
| **Testing** | Vitest 2.1.9 |
| **Deploy** | Cloudflare Workers + Pages (primary), Vercel (fallback) |

---

## Repository Structure

```
cnktyk/
├── lib/db/              # Database layer (client, schemas, repositories) - at root for script access
├── openspec/            # Spec-driven development (specs/, changes/, archive/, project.md)
├── scripts/             # Admin/testing scripts (run via `npx tsx`)
├── src/
│   ├── app/            # Next.js App Router (api/, dashboard/, audit/, so-y-te/)
│   ├── components/     # React components (ui/, forms/, dashboard/, etc.)
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Business logic (auth/, db/, storage/, features/)
│   └── types/          # TypeScript types
├── middleware.ts        # NextAuth route protection
└── migrations/          # SQL migrations
```

**Key:** `openspec/` for specs, `lib/db/` (root) for DB, `src/lib/` for app logic, `scripts/` for utilities.

---

## Development Workflow

### Getting Started
```bash
npm install
cp .env.example .env.local  # Configure credentials
npm run dev
```

### Before Any Task
1. **Bootstrap superpowers:** Run `~/.codex/superpowers/.codex/superpowers-codex bootstrap`
2. **Read docs:** `openspec/specs/[capability]/spec.md`, `openspec/changes/`, `openspec/project.md`, this file
3. **Use TodoWrite:** Create todos for multi-step tasks, mark in_progress before starting, completed after finishing
4. **Understand context:** `openspec list`, `openspec list --specs`, use MCP tools (see WARP.md)

### Spec-Driven Development
1. **Proposal:** Create in `openspec/changes/[change-id]/`
2. **Review:** Get approval before implementing
3. **Implement:** Follow tasks.md sequentially
4. **Archive:** Move to `archive/` after deployment

### When to Create a Proposal
**Create:** New features, breaking changes, architecture changes, performance optimizations, security updates
**Skip:** Bug fixes (restoring behavior), typos/formatting, non-breaking dependency updates, config changes

---

## Git & Commits

### Conventional Commits Format
`<type>: <subject>` (subject under 100 chars, imperative mood, no period)

**Types:** `feat` (new feature), `fix` (bug), `docs` (documentation), `refactor` (restructure), `style` (format), `test`, `chore` (tooling), `perf`

**Examples:**
```
feat: Add bulk practitioner import functionality
fix: Correct login logic for admin user
refactor: Optimize database query performance in practitioners list
docs: Update API documentation for user endpoints
```

**Avoid:** "Fixed stuff", "WIP", "Updated files", "changes"

### Git Operations
```bash
git status && git diff          # Verify changes
git add <files>                 # Stage relevant files
git commit -m "type: subject"   # Conventional format
git log --oneline               # Review history
```

---

## Code Conventions

### TypeScript
- Strict mode, no `any` types
- Explicit return types, proper interfaces
- Zod schemas for runtime validation
- Path aliases: `@/*` for src imports

### Naming
- **Components:** PascalCase (`UserProfile`)
- **Functions/Variables:** camelCase (`getUserData`)
- **Files:** kebab-case (`user-profile.tsx`)
- **Database:** PascalCase without diacritics (Vietnamese)
- **API routes:** kebab-case folders

### Import Order
```typescript
// 1. External (React, Next.js, libraries)
// 2. Internal using @/* aliases
// 3. Relative (only when necessary)
```

### Component Pattern
```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { User } from '@/types';

interface UserCardProps {
  user: User;
  onUpdate: (id: string) => void;
}

export function UserCard({ user, onUpdate }: UserCardProps) {
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  return (
    <div className="glass-card">
      <Button onClick={() => onUpdate(user.id)} disabled={loading}>Update</Button>
    </div>
  );
}
```

### Styling
- Tailwind CSS classes, no inline styles
- Glass components from `@/components/ui/`
- Healthcare colors: Blue `#0066CC`, Green `#00A86B`, Amber `#F59E0B`, Red `#DC2626`

### Error Handling
```typescript
// API routes
try {
  const data = await repository.findById(id);
  return NextResponse.json(data);
} catch (error) {
  console.error('Error:', error);
  return NextResponse.json({ error: 'Failed' }, { status: 500 });
}

// Client
try {
  await submitForm(data);
  toast.success('Success');
} catch (error) {
  toast.error('Error occurred');
  console.error(error);
}
```

---

## Architecture

### Multi-Tenant System
**Data isolation via WHERE clauses** (RLS disabled). Always filter DonVi role by unit:

```typescript
const whereClause = session.user.role === 'DonVi' ? `WHERE "MaDonVi" = $1` : '';
const params = session.user.role === 'DonVi' ? [session.user.unitId] : [];
```

### Database Layer (`lib/db/`)
- **client.ts:** DatabaseClient singleton (query, queryOne, insert, update, delete, paginate, exists, count) - parameterized placeholders
- **schemas.ts:** Zod schemas (runtime validation + types)
- **repositories.ts:** Repository pattern (BaseRepository, specialized repos, business logic)
- **utils.ts:** auth, hash/verify passwords, audit helpers

### Authentication (`src/lib/auth/`)
- **JWT:** 5min expiry, 2hr session timeout, refresh on request
- **Session:** `{ id, username, role, unitId }`
- **Middleware:** Route-based role checking, auto-redirects, feature flags
- **Passwords:** bcryptjs (cost=10)

### File Storage (`src/lib/storage/r2-client.ts`)
- AWS SDK v3 compatible
- Presigned URLs (24hr expiry)
- SHA-256 checksums
- ZIP export backup system

---

## Database Operations

### Core Tables
`DonVi`, `TaiKhoan` (auth), `NhanVien` (practitioners), `GhiNhanHoatDong` (activities), `DanhMucHoatDong` (catalog), `QuyTacTinChi` (rules), `ThongBao` (notifications), `NhatKyHeThong` (audit)

### Repository Pattern (REQUIRED - no raw SQL in components)
```typescript
import { NhanVienRepository } from '@/lib/db/repositories';

const repo = new NhanVienRepository();
const item = await repo.findById(id);
const all = await repo.findAll({ MaDonVi: unitId });
const created = await repo.create(data);
const updated = await repo.update(id, data);
await repo.delete(id);
```

### Parameterized Queries (REQUIRED - prevent SQL injection)
```typescript
// CORRECT ✅
db.query('SELECT * FROM "TaiKhoan" WHERE "TenDangNhap" = $1', [username]);

// WRONG ❌ - SQL injection risk
db.query(`SELECT * FROM "TaiKhoan" WHERE "TenDangNhap" = '${username}'`);
```

### Credit Calculation
```typescript
if (activity.SoTinChiQuyDoi !== null) {
  return activity.SoTinChiQuyDoi;  // Manual override
} else if (catalog.DonViTinh === 'gio') {
  return activity.SoGio * catalog.TyLeQuyDoi;  // Auto-convert
}
// Apply category caps at cycle level
```

### 5-Year Compliance Cycle
```typescript
const cycleStart = practitioner.NgayCapCCHN;
const cycleEnd = addYears(cycleStart, 5);
const totalCredits = await sumCreditsInRange(practitionerId, cycleStart, cycleEnd);
const progress = (totalCredits / 120) * 100;  // Target: 120 credits
```

---

## API Development

### Route Pattern
```typescript
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role !== 'SoYTe' && session.user.role !== 'DonVi') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const repo = new ResourceRepository();
  const filters = session.user.role === 'DonVi' ? { MaDonVi: session.user.unitId } : {};

  try {
    const data = await repo.findAll(filters);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Dynamic Routes
```typescript
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ... validate, fetch, respond
}
```

### Input Validation (Zod)
```typescript
const validated = CreateNhanVienSchema.parse(body);
```

### Current API Notes
- Activity Report: parse `showAll` manually before Zod, avoid debug `console.log`
- Practitioner Detail: use `COALESCE(g."TenHoatDong", dm."TenDanhMuc")`, cast `dm."LoaiHoatDong"` to text with `'Khac'` fallback
- Prefer shared `UUIDSchema` for query/path IDs

---

## Security

### Passwords (bcryptjs only - Workers compatible)
```typescript
import bcrypt from 'bcryptjs';
const hashed = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hashed);
```

### Tenant Isolation (CRITICAL for DonVi)
```typescript
// Filter queries
if (session.user.role === 'DonVi') filters.MaDonVi = session.user.unitId;

// Verify ownership
const existing = await repo.findById(id);
if (session.user.role === 'DonVi' && existing.MaDonVi !== session.user.unitId) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Input Validation
```typescript
const validated = CreateNhanVienSchema.parse(data);
```

### Audit Logging
```typescript
await auditLog({
  MaTaiKhoan: session.user.id,
  HanhDong: 'CREATE',  // CREATE, UPDATE, DELETE, LOGIN
  Bang: 'NhanVien',
  KhoaChinh: created.MaNhanVien,
  NoiDung: { data: validated },
  DiaChiIP: request.headers.get('x-forwarded-for') || 'unknown',
});
```

### File Upload Security
- Validate MIME types + magic bytes
- Limit sizes (5MB PDF, 1MB images target)
- Store SHA-256 checksums
- Use presigned URLs (24hr expiry)
- Log signature mismatches as security events

### Security Pitfalls
**Avoid:** `any` types, string SQL concat, exposing sensitive data, skipping auth, forgetting DonVi filters, plain text passwords, native bcrypt
**Do:** Proper types, parameterized queries, generic errors, always auth, always filter by unitId, bcryptjs, Workers-compatible libs

---

## OpenSpec Workflow

### When to Propose
**Create proposal:** New features, breaking changes, architecture changes, performance optimizations, security updates
**Skip:** Bug fixes (restoring behavior), typos/formatting, non-breaking deps, config, tests for existing behavior

### Three Stages

#### 1. Create Change
```bash
openspec list && openspec list --specs
mkdir -p openspec/changes/add-feature/specs/capability
```

Files: `proposal.md`, `tasks.md`, `specs/capability/spec.md`, optional `design.md`
```bash
openspec validate add-feature --strict
```

#### 2. Implement
Read proposal → Read design (if any) → Follow tasks.md sequentially → Update checklist

#### 3. Archive
```bash
openspec archive add-feature --yes
openspec archive tooling-change --skip-specs --yes
```

### CLI
```bash
openspec list              # Active changes
openspec list --specs      # All specs
openspec show [item]       # Details
openspec validate [change] --strict
openspec archive <id> --yes
```

### Spec Format (CRITICAL)
```markdown
#### Scenario: Description
- **WHEN** condition
- **THEN** expected result
```

**Deltas:** `## ADDED Requirements`, `## MODIFIED Requirements` (include full text), `## REMOVED Requirements`, `## RENAMED Requirements`

---

## Feature Flags

Managed via `src/lib/features/flags.ts` and `.env`:

```env
ENABLE_BULK_IMPORT=true
ENABLE_PDF_EXPORT=true
ENABLE_EMAIL_NOTIFICATIONS=false
ENABLE_AUDIT_EXPORT=true
ENABLE_DONVI_ACCOUNT_MANAGEMENT=false
```

```typescript
import { isDonViAccountManagementEnabled } from '@/lib/features/flags';

if (isDonViAccountManagementEnabled()) {
  return <AccountManagementUI />;
}
```

---

## Deployment

### Targets
**Primary:** Cloudflare Workers + Pages
**Fallback:** Vercel (requires Node.js runtime)

### Workers Compatibility
**Use:** `@neondatabase/serverless`, `bcryptjs`, AWS SDK v3 for R2
**Avoid:** node-postgres, native bcrypt
**Enable:** `nodejs_compat` in wrangler.toml for R2

### Pre-Deploy Checklist
```bash
npm run verify:production  # Check env vars
npm run build:check        # typecheck + lint + build
npx tsx scripts/test-database.ts
npm run build
npm run deploy:production
npm run seed:production    # First time only
```

### Environment Variables
**Required:** `NEXTAUTH_URL` (HTTPS), `NEXTAUTH_SECRET`, `AUTH_SECRET`, `DATABASE_URL`, `POSTGRES_URL`, `CF_R2_*` (account, keys, bucket, endpoint, public URL), feature flags

### CI/CD
- Push to `main` → Auto-deploy production
- Pull requests → Auto-deploy preview

### Docs
`docs/deployment-guide.md`, `docs/cloudflare-pages-setup.md`, `docs/security-hardening.md`, `docs/production-checklist.md`

---

## Quick Reference

### Common Commands
```bash
npm run dev                 # Start dev server
npm run build               # Production build
npm run typecheck           # Type checking
npm run test                # Run tests

# Database testing
npx tsx scripts/test-database.ts
npx tsx scripts/test-repositories.ts
npx tsx scripts/test-complete-system.ts

# Utilities
npx tsx scripts/create-dev-accounts.ts
npx tsx scripts/check-accounts.ts
```

### Key Files
| Category | Files |
|----------|-------|
| **Config** | `next.config.ts`, `tsconfig.json`, `middleware.ts`, `wrangler.toml`, `.env.example` |
| **Database** | `lib/db/client.ts`, `lib/db/schemas.ts`, `lib/db/repositories.ts`, `lib/db/utils.ts` |
| **Auth** | `src/lib/auth/config.ts`, `src/lib/auth/hooks.ts`, `middleware.ts` |
| **Logic** | `src/lib/db/credit-engine.ts`, `src/lib/audit/logger.ts`, `src/lib/storage/r2-client.ts` |
| **API** | `src/app/api/practitioners/`, `src/app/api/submissions/`, `src/app/api/backup/` |
| **Docs** | `CLAUDE.md`, `openspec/project.md`, `WARP.md`, `docs/` |

### MCP Tools (WARP.md)
1. **Database:** Neon MCP (`describe_table_schema`, `run_sql`, etc.)
2. **Codebase:** gkg MCP (`search_codebase_definitions`, `get_references`)
3. **Reasoning:** human MCP (`brain_analyze_simple`, `sequentialthinking`)

### Design System
**Glassmorphism:** `rgba(255,255,255,0.25)` bg, `blur(12px)`, `rgba(255,255,255,0.3)` border, `0.75rem` radius
**Colors:** Blue `#0066CC`, Green `#00A86B`, Amber `#F59E0B`, Red `#DC2626`

### Backup Center
**UI:** `/so-y-te/backup` (SoYTe only)
**API:** `POST /api/backup/evidence-files`, `GET /api/backup/dashboard`, `POST /api/backup/delete-archived`

### Audit System
**UI:** `/audit` (SoYTe/Auditor)
**Features:** Track mutations, auth events, file ops, approvals, CSV export, SHA-256 checksums

---

## Best Practices

**DO:**
- Bootstrap superpowers each session
- Use TodoWrite for multi-step tasks
- Follow OpenSpec workflow for significant changes
- Use Conventional Commits
- Use repositories - never raw SQL
- Parameterize all queries
- Validate with Zod
- Hash passwords with bcryptjs
- Enforce DonVi tenant isolation
- Log mutations to audit system
- Use Workers-compatible libraries

**DON'T:**
- Use `any` types
- Concatenate SQL strings
- Skip authentication checks
- Forget DonVi tenant filtering
- Use native bcrypt (use bcryptjs)
- Implement before proposal approval
- Batch todo completions
- Skip OpenSpec validation
- Use node-postgres (use @neondatabase/serverless)
- Create files unnecessarily (prefer editing)
- Run `npm run lint` after tasks unless requested

---

**Questions:** Check `CLAUDE.md` → `openspec/project.md` → `openspec/specs/` → `docs/` → `openspec/changes/archive/`

**Last Updated:** 2025-11-14
**Repository:** https://github.com/thienchi2109/cnktyk
