# CLAUDE.md - AI Assistant Guide for CNKTYKLT Platform

**Last Updated:** 2025-11-14

This document provides comprehensive guidance for AI assistants working with the CNKTYKLT Compliance Management Platform. Always reference this file before making significant changes.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Repository Structure](#repository-structure)
4. [Development Workflow](#development-workflow)
5. [Git Workflow and Commit Messages](#git-workflow-and-commit-messages)
6. [Code Conventions](#code-conventions)
7. [Architecture Patterns](#architecture-patterns)
8. [Database Operations](#database-operations)
9. [API Development](#api-development)
10. [Security Guidelines](#security-guidelines)
11. [Testing](#testing)
12. [Common Commands](#common-commands)
13. [OpenSpec Workflow](#openspec-workflow)
14. [Feature Flags](#feature-flags)
15. [Deployment](#deployment)
16. [Key File Locations](#key-file-locations)

---

## Project Overview

**CNKTYKLT Compliance Management Platform** is a healthcare compliance tracking system for managing Continuing Professional Development (CPD) credits for Vietnamese healthcare practitioners. The platform tracks activities, approvals, and 5-year cycle compliance across the Department of Health and healthcare units.

### User Roles

The system supports four distinct user roles:

1. **SoYTe** (Department of Health) - Full system access across all units
2. **DonVi** (Unit Admin) - Access to their unit's data only
3. **NguoiHanhNghe** (Practitioner) - Access to own activity records
4. **Auditor** - Read-only access for compliance auditing

### Key Features

- Healthcare Practitioner Management with compliance tracking
- Activity Submission & Approval workflows
- Role-Based Access Control with middleware protection
- Evidence File Management with Cloudflare R2 integration
- Evidence Backup Center (streaming ZIP exports, download progress, cleanup tools)
- Comprehensive Audit Logging for all data modifications
- Real-time Compliance Tracking (5-year cycle monitoring)
- Glassmorphism UI design system optimized for healthcare

---

## Technology Stack

### Core Framework
- **Next.js 15.5.4** with App Router (Turbopack enabled)
- **React 19.1.0** with TypeScript
- **Node.js 18+** (required)

### Database & Storage
- **Neon PostgreSQL** (serverless) via `@neondatabase/serverless`
- **Cloudflare R2** for file storage (AWS SDK v3 compatible)

### Authentication & State
- **NextAuth.js v5** (beta) with JWT sessions
- **bcryptjs** for password hashing (Workers compatible)
- **TanStack Query v5** for server state management
- **React Hook Form** with Zod resolvers for forms

### UI & Styling
- **TailwindCSS 4.0** with PostCSS
- **glasscn-ui** components (custom glassmorphism design system)
- **Radix UI** primitives for accessible components
- **Lucide React** for icons

### Validation & Types
- **Zod 4.1.11** for runtime validation
- **TypeScript 5** with strict mode enabled

### Testing & Development
- **Vitest 2.1.9** for unit testing
- **ESLint 9** with Next.js config
- **tsx** for running TypeScript scripts

### Deployment Targets
- **Primary:** Cloudflare Workers + Pages
- **Fallback:** Vercel (requires Node.js runtime)

---

## Repository Structure

```
cnktyk/
├── .github/              # GitHub Actions workflows
├── .kiro/               # Legacy feature specifications
├── docs/                # Documentation (deployment, performance, sessions)
├── lib/                 # Root-level library utilities
│   ├── db/             # Database layer (outside src/)
│   ├── config.ts       # Configuration utilities
│   └── utils/          # General utilities
├── migrations/          # Database migration scripts (SQL)
├── openspec/           # Active change proposals and specs
│   ├── project.md      # Project conventions
│   ├── specs/          # Current truth - capabilities that ARE built
│   ├── changes/        # Proposals - what SHOULD change
│   └── archive/        # Completed changes
├── public/             # Static assets
├── scripts/            # Utility scripts (testing, seeding, migrations)
├── src/                # Application source code
│   ├── app/           # Next.js App Router
│   │   ├── api/       # API routes
│   │   ├── audit/     # Audit system pages
│   │   ├── dashboard/ # Dashboard pages
│   │   ├── demo/      # Demo/testing pages
│   │   └── so-y-te/   # SoYTe-specific routes (backup center)
│   ├── components/     # React components
│   │   ├── ui/        # Base glasscn-ui components
│   │   ├── auth/      # Authentication components
│   │   ├── forms/     # Form components
│   │   ├── dashboard/ # Dashboard-specific components
│   │   ├── layout/    # Layout components
│   │   ├── activities/   # Activity management
│   │   ├── audit/        # Audit log components
│   │   ├── cohorts/      # Cohort builder
│   │   ├── credits/      # Credit tracking
│   │   ├── notifications/# Notification system
│   │   ├── practitioners/# Practitioner management
│   │   ├── storage/      # File storage UI
│   │   ├── submissions/  # Activity submissions
│   │   └── users/        # User management
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Application-level utilities
│   │   ├── api/       # API utilities and mappers
│   │   ├── audit/     # Audit logging system
│   │   ├── auth/      # NextAuth configuration
│   │   ├── dashboard/ # Dashboard metrics
│   │   ├── db/        # Database client, schemas, repositories
│   │   ├── features/  # Feature flags
│   │   ├── import/    # Bulk import system
│   │   ├── practitioners/ # Practitioner search
│   │   ├── storage/   # R2 client
│   │   └── utils/     # Utility functions (cn.ts)
│   └── types/          # TypeScript type definitions
├── tests/              # Test files
├── types/              # Global TypeScript types
├── .env.example        # Environment variables template
├── .env.production.template # Production environment template
├── middleware.ts       # NextAuth middleware for route protection
├── next.config.ts      # Next.js configuration
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── vitest.config.ts    # Vitest configuration
└── wrangler.toml       # Cloudflare Workers configuration
```

### Key Directory Purposes

- **`openspec/`**: Spec-driven development system (see [OpenSpec Workflow](#openspec-workflow))
- **`lib/db/`**: Database layer at root level (outside src/) for script access
- **`src/lib/`**: Application-level utilities and business logic
- **`scripts/`**: Administrative and testing scripts run via `npx tsx`
- **`docs/`**: Session notes, deployment guides, and technical documentation

---

## Development Workflow

### Getting Started

1. **Clone and install:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

### Before Starting Any Task

**Always follow this checklist:**

0. **Bootstrap superpowers:** Run `~/.codex/superpowers/.codex/superpowers-codex bootstrap` at the start of the session and apply any instructions it outputs before proceeding.

1. **Read relevant documentation:**
   - Check `openspec/specs/[capability]/spec.md` for requirements
   - Review `openspec/changes/` for pending changes
   - Read `openspec/project.md` for conventions
   - Check this CLAUDE.md for patterns

2. **Use TodoWrite tool:**
   - Create todos for multi-step tasks
   - Mark tasks in_progress before starting
   - Mark completed immediately after finishing
   - Keep ONE task in_progress at a time

3. **Understand the context:**
   - Run `openspec list` to see active changes
   - Run `openspec list --specs` to see existing capabilities
   - Use specialized MCP tools (see WARP.md)

### Spec-Driven Development Approach

This project follows a **spec-driven development workflow**:

1. **Proposal Phase:** Create change proposals in `openspec/changes/[change-id]/`
2. **Review Phase:** Get approval before implementation
3. **Implementation Phase:** Follow tasks.md sequentially
4. **Archive Phase:** Move to `archive/` after deployment

See [OpenSpec Workflow](#openspec-workflow) section for detailed guidance.

### Decision Tree: When to Create a Proposal

```
New request received?
├─ Bug fix restoring intended behavior? → Fix directly
├─ Typo/formatting/comments? → Fix directly
├─ Dependency updates (non-breaking)? → Fix directly
├─ Configuration changes? → Fix directly
├─ New feature/capability? → Create proposal
├─ Breaking change? → Create proposal
├─ Architecture change? → Create proposal
├─ Performance optimization? → Create proposal
└─ Unclear? → Create proposal (safer)
```

**Rule of thumb:** When in doubt, create a proposal. It's better to have documentation.

---

## Git Workflow and Commit Messages

### Conventional Commits

This project follows **Conventional Commits** specification for commit messages. Writing clear, standardized commit messages is a critical skill that answers two essential questions: **What did you do?** and **Why?**

### Commit Message Format

The basic syntax is: `<type>: <subject>`

**Type:** Describes the category of change. Use these main types:

- **feat**: Add a new feature
- **fix**: Fix a bug
- **docs**: Update documentation
- **refactor**: Refactor code (optimize, restructure) without adding features or fixing bugs
- **style**: Format code (whitespace, semicolons, indentation, etc.)
- **test**: Add or update tests
- **chore**: Update build tasks, package manager configs, etc.
- **perf**: Performance improvements

**Subject:** A brief description (under 100 characters) of what you did. Write in imperative mood, present tense (as if giving a command).

### Examples

✅ **Good commit messages:**
```
fix: Correct login logic for admin user
feat: Add Google login button to homepage
docs: Update API documentation for user endpoints
refactor: Optimize database query performance in practitioners list
style: Fix indentation in auth components
test: Add unit tests for credit calculation
```

❌ **Bad commit messages:**
```
Fixed stuff
WIP
Updated files
changes
asdfgh
```

### Commit Message Best Practices

1. **Be specific:** Describe what changed, not just where
2. **Use imperative mood:** "Add feature" not "Added feature" or "Adds feature"
3. **Keep subject line short:** Under 100 characters
4. **Don't end with period:** No punctuation at the end of subject line
5. **Reference issues when relevant:** `fix: Resolve login error (#123)`

### Extended Format (Optional)

For more complex changes, you can use the extended format with body and footer:

```
<type>: <subject>

<body>

<footer>
```

**Example:**
```
feat: Add bulk practitioner import functionality

Implement Excel file upload and validation for importing multiple
practitioners at once. Includes error handling and progress tracking.

Closes #45
```

### When to Use Each Type

- **feat** - Adding any new functionality users can see or use
- **fix** - Fixing broken functionality that wasn't working as intended
- **docs** - ONLY documentation changes (README, guides, comments)
- **refactor** - Code changes that neither fix bugs nor add features (performance, readability)
- **style** - Code formatting only (no logic changes)
- **test** - Adding missing tests or correcting existing tests
- **chore** - Tooling changes (dependencies, configs, build scripts)

### Git Operations Reference

When creating commits in this project:

1. **Always use Conventional Commits format**
2. **Verify changes before committing:** `git status` and `git diff`
3. **Stage relevant files:** `git add <files>`
4. **Create commit with proper format:** `git commit -m "type: subject"`
5. **Review commit history for context:** `git log --oneline`

See the [Development Workflow](#development-workflow) section for detailed git operations and the full commit creation process.

---

## Code Conventions

### TypeScript Standards

- **Strict mode enabled** - No `any` types
- **Explicit return types** on all functions
- **Proper interfaces** for props and data structures
- **Use Zod schemas** for runtime validation
- **Path aliases:** Use `@/*` for src imports

### Import Order

```typescript
// 1. External imports (React, Next.js, libraries)
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Internal imports using @/* aliases
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/hooks';
import type { User } from '@/types';

// 3. Relative imports (only when necessary)
import { localHelper } from './utils';
```

### Naming Conventions

- **Components:** PascalCase (`UserProfile`, `GlassCard`)
- **Functions/Variables:** camelCase (`getUserData`, `isActive`)
- **Files:** kebab-case (`user-profile.tsx`, `auth-utils.ts`)
- **Database columns:** PascalCase without diacritics (Vietnamese convention)
- **API routes:** kebab-case folders (`/api/user-profile/route.ts`)

### Component Structure

```typescript
'use client'; // Only for client components

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { User } from '@/types';

interface UserCardProps {
  user: User;
  onUpdate: (id: string) => void;
}

export function UserCard({ user, onUpdate }: UserCardProps) {
  const [loading, setLoading] = useState(false);

  // Event handlers
  const handleClick = async () => {
    setLoading(true);
    await onUpdate(user.id);
    setLoading(false);
  };

  // Early returns
  if (!user) return null;

  // Main render
  return (
    <div className="glass-card">
      <h2>{user.name}</h2>
      <Button onClick={handleClick} disabled={loading}>
        Update
      </Button>
    </div>
  );
}
```

### Styling Patterns

- **Use Tailwind CSS classes** - No inline styles unless necessary
- **Glass components** from `@/components/ui/` for consistency
- **Healthcare color palette:**
  - Medical Blue `#0066CC` - Primary actions
  - Medical Green `#00A86B` - Success states
  - Medical Amber `#F59E0B` - Warnings
  - Medical Red `#DC2626` - Errors

### Error Handling

```typescript
// API routes
try {
  const data = await repository.findById(id);
  return NextResponse.json(data);
} catch (error) {
  console.error('Error fetching data:', error);
  return NextResponse.json(
    { error: 'Failed to fetch data' },
    { status: 500 }
  );
}

// Client components
try {
  await submitForm(data);
  toast.success('Đã lưu thành công');
} catch (error) {
  toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
  console.error(error);
}
```

---

## Architecture Patterns

### Multi-Tenant Role-Based System

**Data Isolation:** Application-level enforcement via `WHERE` clauses. Row-Level Security (RLS) is **disabled**.

**Tenant Filtering Pattern:**
```typescript
// For DonVi role - always filter by unit
const whereClause = session.user.role === 'DonVi'
  ? `WHERE "MaDonVi" = $1`
  : '';
const params = session.user.role === 'DonVi'
  ? [session.user.unitId]
  : [];

const result = await db.query(
  `SELECT * FROM "NhanVien" ${whereClause}`,
  params
);
```

### Database Layer Architecture

Located in `lib/db/` (root level, outside src/):

- **`client.ts`** - DatabaseClient singleton with Neon serverless driver
  - Methods: `query()`, `queryOne()`, `insert()`, `update()`, `delete()`, `paginate()`, `exists()`, `count()`
  - All queries use parameterized placeholders (`$1`, `$2`, etc.)
  - Lazy-initialized via Proxy pattern

- **`schemas.ts`** - Zod validation schemas
  - Runtime validation + TypeScript type generation
  - Create/Update variant schemas (e.g., `CreateTaiKhoan`, `UpdateNhanVien`)

- **`repositories.ts`** - Repository pattern
  - `BaseRepository<T, CreateT, UpdateT>` abstract class
  - Specialized repositories per entity
  - Business logic: password hashing, credit calculation, compliance tracking

- **`utils.ts`** - Database utilities
  - `authenticateUser(username, password)`
  - `hashPassword()`, `verifyPassword()`
  - Audit logging helpers

### Authentication Flow

**NextAuth.js Configuration** (`src/lib/auth/`):

1. **JWT Strategy:**
   - 5-minute token expiry
   - 2-hour session timeout
   - Token refreshed on each request
   - Session includes: `{ id, username, role, unitId }`

2. **Middleware Protection** (`middleware.ts`):
   - Route-based role checking
   - Automatic redirects to role-specific dashboards
   - Feature flag integration (e.g., DonVi account management)

3. **Security:**
   - Passwords hashed with bcryptjs (cost=10)
   - JWT tokens contain: `{ sub, role, unitId, username, sessionStart }`
   - Session times out after 2 hours regardless of activity

### File Storage Architecture

**Cloudflare R2 Integration** (`src/lib/storage/r2-client.ts`):

- AWS SDK v3 compatible API
- Presigned URLs for secure downloads (24-hour expiry)
- SHA-256 checksums for file integrity
- Evidence file metadata stored in database
- Backup system with streaming ZIP exports

---

## Database Operations

### Core Tables (Vietnamese Column Names)

1. **DonVi** - Healthcare units hierarchy
2. **TaiKhoan** - User accounts (authentication)
3. **NhanVien** - Healthcare practitioners
4. **GhiNhanHoatDong** - CPD activity entries
5. **DanhMucHoatDong** - Activity catalog
6. **QuyTacTinChi** - Credit rules engine
7. **ThongBao** - Notifications
8. **NhatKyHeThong** - Audit log

### Repository Usage Pattern

**ALWAYS use repositories - never write raw SQL in components:**

```typescript
import { NhanVienRepository } from '@/lib/db/repositories';

// In API route or server component
const repository = new NhanVienRepository();

// CRUD operations
const practitioner = await repository.findById(id);
const all = await repository.findAll({ MaDonVi: unitId });
const created = await repository.create(data);
const updated = await repository.update(id, data);
await repository.delete(id);
```

### Parameterized Queries

**ALWAYS use parameterized queries to prevent SQL injection:**

```typescript
// CORRECT ✅
const result = await db.query(
  'SELECT * FROM "TaiKhoan" WHERE "TenDangNhap" = $1',
  [username]
);

// WRONG ❌ - SQL injection risk
const result = await db.query(
  `SELECT * FROM "TaiKhoan" WHERE "TenDangNhap" = '${username}'`
);
```

### Credit Calculation Logic

```typescript
// Auto-conversion from hours to credits
if (activity.SoTinChiQuyDoi !== null) {
  // Manual override - use as-is
  return activity.SoTinChiQuyDoi;
} else if (catalog.DonViTinh === 'gio') {
  // Auto-convert: hours * conversion rate
  return activity.SoGio * catalog.TyLeQuyDoi;
}
// Apply category caps at cycle level
```

### 5-Year Compliance Cycle

```typescript
const cycleStart = practitioner.NgayCapCCHN; // License issue date
const cycleEnd = addYears(cycleStart, 5);
const totalCredits = await sumCreditsInRange(practitionerId, cycleStart, cycleEnd);
const progress = (totalCredits / 120) * 100; // Target: 120 credits
```

---

## API Development

### API Route Pattern

```typescript
// src/app/api/[resource]/route.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { ResourceRepository } from '@/lib/db/repositories';

export async function GET(request: Request) {
  // 1. Authentication check
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Role-based authorization
  if (session.user.role !== 'SoYTe' && session.user.role !== 'DonVi') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Tenant filtering
  const repository = new ResourceRepository();
  const filters = session.user.role === 'DonVi'
    ? { MaDonVi: session.user.unitId }
    : {};

  try {
    // 4. Database operation
    const data = await repository.findAll(filters);

    // 5. Response
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Dynamic Route Parameters

```typescript
// src/app/api/practitioners/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const repository = new NhanVienRepository();
  const practitioner = await repository.findById(id);

  if (!practitioner) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(practitioner);
}
```

### Input Validation with Zod

```typescript
import { CreateNhanVienSchema } from '@/lib/db/schemas';

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate input
    const validated = CreateNhanVienSchema.parse(body);

    const repository = new NhanVienRepository();
    const created = await repository.create(validated);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Security Guidelines

### Password Handling

**ALWAYS use bcryptjs (Workers compatible):**

```typescript
import bcrypt from 'bcryptjs';

// Hashing
const hashedPassword = await bcrypt.hash(password, 10);

// Verification
const isValid = await bcrypt.compare(password, hashedPassword);
```

### Tenant Isolation

**CRITICAL: Always enforce tenant boundaries for DonVi role:**

```typescript
// For any query involving user data
if (session.user.role === 'DonVi') {
  // MUST filter by user's unit
  filters.MaDonVi = session.user.unitId;
}

// Verify ownership before updates
const existing = await repository.findById(id);
if (session.user.role === 'DonVi' && existing.MaDonVi !== session.user.unitId) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Input Validation

**ALWAYS validate with Zod before database operations:**

```typescript
import { CreateNhanVienSchema } from '@/lib/db/schemas';

// Runtime validation
const validated = CreateNhanVienSchema.parse(data);
```

### Audit Logging

**Log all mutations to NhatKyHeThong:**

```typescript
import { auditLog } from '@/lib/audit';

await auditLog({
  MaTaiKhoan: session.user.id,
  HanhDong: 'CREATE', // CREATE, UPDATE, DELETE, LOGIN, etc.
  Bang: 'NhanVien',
  KhoaChinh: created.MaNhanVien,
  NoiDung: { data: validated },
  DiaChiIP: request.headers.get('x-forwarded-for') || 'unknown',
});
```

### File Upload Security

- **Validate file types** - Check MIME types
- **Limit file sizes** - Enforce maximum size limits
- **Store checksums** - SHA-256 for integrity verification
- **Presigned URLs** - Time-limited access (24 hours)
- **Never serve files directly** - Always use presigned URLs

### Common Security Pitfalls

❌ **AVOID:**
- Using `any` type (disables type checking)
- String concatenation in SQL queries (SQL injection)
- Exposing sensitive data in error messages
- Skipping authentication checks
- Forgetting tenant filtering for DonVi role
- Storing passwords in plain text
- Using native bcrypt (not Workers compatible)

✅ **DO:**
- Use proper TypeScript types
- Use parameterized queries ($1, $2, etc.)
- Return generic error messages to client
- Check authentication in every API route
- Always filter by unitId for DonVi role
- Hash passwords with bcryptjs
- Use Workers-compatible libraries

---

## Testing

### Test Organization

```
tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
└── e2e/              # End-to-end tests (future)
```

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- path/to/test.test.ts

# Watch mode
npm run test:watch
```

### Database Testing Scripts

Located in `scripts/`:

```bash
# Test database connection
npx tsx scripts/test-database.ts

# Test all repositories
npx tsx scripts/test-repositories.ts

# Test core functionality
npx tsx scripts/test-core-functionality.ts

# Run complete system test
npx tsx scripts/test-complete-system.ts
```

### Unit Test Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { calculateCredits } from '@/lib/db/credit-utils';

describe('Credit Calculation', () => {
  it('should convert hours to credits', () => {
    const result = calculateCredits({
      SoGio: 10,
      DonViTinh: 'gio',
      TyLeQuyDoi: 1.5,
    });

    expect(result).toBe(15);
  });

  it('should use manual override when provided', () => {
    const result = calculateCredits({
      SoTinChiQuyDoi: 20,
      SoGio: 10,
      TyLeQuyDoi: 1.5,
    });

    expect(result).toBe(20); // Uses override, not calculated
  });
});
```

---

## Common Commands

### Development

```bash
# Start dev server with Turbopack
npm run dev

# Build for production
npm run build

# Build with checks (typecheck + lint + build)
npm run build:check

# Start production server
npm start
```

### Code Quality

Skip running `npm run lint` after finishing tasks unless explicitly requested; rely on other validators instead per the current workflow.

```bash
# Run TypeScript type checking
npm run typecheck

# Run ESLint (skip at the end of tasks unless specifically required)
npm run lint

# Run ESLint with auto-fix
npm run lint:fix

# Run both typecheck and lint
npm run check
```

### Database Operations

```bash
# Test database connection
npx tsx scripts/test-database.ts

# Test repositories
npx tsx scripts/test-repositories.ts

# Test core functionality
npx tsx scripts/test-core-functionality.ts

# Run complete system test
npx tsx scripts/test-complete-system.ts

# Seed production data (first deploy only)
npm run seed:production

# Verify production environment
npm run verify:production
```

### Deployment

```bash
# Deploy preview to Cloudflare Pages
npm run deploy:preview

# Deploy production to Cloudflare Pages
npm run deploy:production
```

### Utility Scripts

```bash
# Create development accounts
npx tsx scripts/create-dev-accounts.ts

# Check existing accounts
npx tsx scripts/check-accounts.ts

# Run specific migration
npx tsx scripts/run-migration-002.ts
npx tsx scripts/run-migration-003.ts

# Verify migrations
npx tsx scripts/verify-migration-complete.ts
```

---

## OpenSpec Workflow

This project uses **OpenSpec** for spec-driven development. All significant changes should follow this workflow.

### When to Create a Proposal

**CREATE PROPOSAL for:**
- New features or capabilities
- Breaking changes (API, schema)
- Architecture changes
- Performance optimizations (behavior changes)
- Security pattern updates

**SKIP PROPOSAL for:**
- Bug fixes (restoring intended behavior)
- Typos, formatting, comments
- Non-breaking dependency updates
- Configuration changes
- Tests for existing behavior

### Three-Stage Workflow

#### Stage 1: Creating Changes

```bash
# 1. Check current state
openspec list                # Active changes
openspec list --specs        # Existing capabilities
openspec spec list --long    # Detailed spec list

# 2. Choose unique change-id (kebab-case, verb-led)
CHANGE=add-practitioner-export

# 3. Scaffold change directory
mkdir -p openspec/changes/$CHANGE/specs/practitioner-management
```

**Create required files:**

`openspec/changes/add-practitioner-export/proposal.md`:
```markdown
## Why
We need to export practitioner data for compliance reporting.

## What Changes
- Add CSV export endpoint to practitioner API
- Create export button in practitioner list UI
- Include filters for date range and unit

## Impact
- Affected specs: practitioner-management
- Affected code: src/app/api/practitioners/, src/components/practitioners/
```

`openspec/changes/add-practitioner-export/tasks.md`:
```markdown
## 1. Implementation
- [ ] 1.1 Create export API endpoint
- [ ] 1.2 Add CSV generation utility
- [ ] 1.3 Add export button to UI
- [ ] 1.4 Add loading state and error handling
- [ ] 1.5 Write tests
```

`openspec/changes/add-practitioner-export/specs/practitioner-management/spec.md`:
```markdown
## ADDED Requirements

### Requirement: Practitioner Data Export
The system SHALL provide CSV export of practitioner data.

#### Scenario: Successful export
- **WHEN** user clicks export button
- **THEN** system generates CSV with filtered practitioners
- **AND** downloads file to user's device

#### Scenario: Export with filters
- **WHEN** user applies date range filter and clicks export
- **THEN** system exports only practitioners matching criteria
```

**Optional `design.md`** - Create only if:
- Cross-cutting change (multiple services)
- New external dependency
- Security/performance/migration complexity
- Ambiguity requiring technical decisions

```bash
# 4. Validate
openspec validate $CHANGE --strict

# 5. Request approval - DO NOT implement until approved
```

#### Stage 2: Implementing Changes

**Use TodoWrite tool to track these steps:**

1. Read `proposal.md` - Understand what's being built
2. Read `design.md` (if exists) - Review technical decisions
3. Read `tasks.md` - Get implementation checklist
4. Implement tasks sequentially - Complete in order
5. Confirm completion - Ensure every item is finished
6. Update checklist - Set every task to `- [x]`

**CRITICAL: Do not start implementation until proposal is approved.**

#### Stage 3: Archiving Changes

After deployment:

```bash
# Archive completed change
openspec archive add-practitioner-export --yes

# For tooling-only changes (no spec updates)
openspec archive some-change-id --skip-specs --yes

# Validate archive succeeded
openspec validate --strict
```

### OpenSpec CLI Reference

```bash
# List and show
openspec list                   # Active changes
openspec list --specs           # All specifications
openspec show [item]            # View change or spec details
openspec show [change] --json --deltas-only  # Debug deltas

# Validation
openspec validate [change] --strict    # Comprehensive checks
openspec validate                      # Bulk validation mode

# Archiving
openspec archive <change-id> [--yes|-y]     # Archive after deployment
openspec archive <change-id> --skip-specs --yes  # Archive without spec updates

# Project management
openspec init [path]            # Initialize OpenSpec
openspec update [path]          # Update instruction files
```

### Spec File Format

**CRITICAL: Scenario formatting must be exact:**

✅ **CORRECT:**
```markdown
#### Scenario: User login success
- **WHEN** valid credentials provided
- **THEN** return JWT token
```

❌ **WRONG:**
```markdown
- **Scenario: User login**     # Bullet point
**Scenario**: User login        # Bold with colon
### Scenario: User login        # Wrong header level
```

**Every requirement MUST have at least one scenario.**

### Delta Operations

- `## ADDED Requirements` - New capabilities
- `## MODIFIED Requirements` - Changed behavior (include full requirement text)
- `## REMOVED Requirements` - Deprecated features
- `## RENAMED Requirements` - Name changes

**When using MODIFIED:**
1. Locate existing requirement in `openspec/specs/<capability>/spec.md`
2. Copy entire requirement block (header + scenarios)
3. Paste under `## MODIFIED Requirements`
4. Edit to reflect new behavior
5. Keep at least one `#### Scenario:`

---

## Feature Flags

Feature flags are defined in `.env` files and managed via `src/lib/features/flags.ts`.

### Current Feature Flags

```env
# Enable bulk import functionality
ENABLE_BULK_IMPORT=true

# Enable PDF export functionality
ENABLE_PDF_EXPORT=true

# Enable email notifications
ENABLE_EMAIL_NOTIFICATIONS=false

# Enable audit log export
ENABLE_AUDIT_EXPORT=true

# Enable DonVi (Unit Admin) account management
ENABLE_DONVI_ACCOUNT_MANAGEMENT=false
```

### Using Feature Flags

```typescript
import { isDonViAccountManagementEnabled } from '@/lib/features/flags';

// In middleware
if (route === "/users" && userRole === "DonVi" && !isDonViAccountManagementEnabled()) {
  return redirect('/dashboard/unit-admin');
}

// In components
if (isDonViAccountManagementEnabled()) {
  return <AccountManagementUI />;
}

return <FeatureDisabledNotice />;
```

### Re-enabling DonVi Account Management

1. Set `ENABLE_DONVI_ACCOUNT_MANAGEMENT=true` in environment
2. Redeploy or restart application
3. Verify navigation link reappears for DonVi users
4. Verify disabled notice disappears

---

## Deployment

### Target Platforms

**Primary:** Cloudflare Workers + Pages
**Fallback:** Vercel (requires Node.js runtime for some features)

### Cloudflare Workers Compatibility

**MUST use Workers-compatible libraries:**
- `@neondatabase/serverless` (NOT node-postgres)
- `bcryptjs` (NOT native bcrypt)
- AWS SDK v3 for R2 storage

**Edge runtime considerations:**
- No Node.js-specific APIs unless marked `runtime = 'nodejs'`
- Connection pooling handled by Neon automatically
- Enable `nodejs_compat` flag in wrangler.toml for R2

### Pre-Deployment Checklist

```bash
# 1. Verify environment variables
npm run verify:production

# 2. Run all checks
npm run build:check

# 3. Test database connectivity
npx tsx scripts/test-database.ts

# 4. Build for production
npm run build

# 5. Deploy to Cloudflare Pages
npm run deploy:production

# 6. Seed initial data (first time only)
npm run seed:production
```

### Environment Variables

**Critical variables for production:**

```env
# Application
NEXTAUTH_URL=https://your-domain.com  # Must be HTTPS
NEXTAUTH_SECRET=<generate-with-openssl>  # openssl rand -base64 32
AUTH_SECRET=<generate-with-openssl>

# Database
DATABASE_URL=postgresql://...
POSTGRES_URL=postgresql://...-pooler/...

# Cloudflare R2
CF_R2_ACCOUNT_ID=...
CF_R2_ACCESS_KEY_ID=...
CF_R2_SECRET_ACCESS_KEY=...
CF_R2_BUCKET_NAME=...
CF_R2_ENDPOINT=https://....r2.cloudflarestorage.com
CF_R2_PUBLIC_URL=https://....r2.dev

# Feature Flags
ENABLE_BULK_IMPORT=true
ENABLE_PDF_EXPORT=true
ENABLE_EMAIL_NOTIFICATIONS=false
ENABLE_AUDIT_EXPORT=true
ENABLE_DONVI_ACCOUNT_MANAGEMENT=false
```

### CI/CD

**GitHub Actions workflows:**
- **Production:** Auto-deploy on push to `main`
- **Preview:** Auto-deploy on pull requests

### Monitoring

- **Cloudflare Analytics** - Enabled by default
- **Error Tracking** - Configure Sentry (optional)
- **Logs** - View in Cloudflare Pages dashboard

### Deployment Documentation

- `docs/deployment-guide.md` - Comprehensive deployment instructions
- `docs/cloudflare-pages-setup.md` - Cloudflare Pages configuration
- `docs/security-hardening.md` - Security best practices
- `docs/production-checklist.md` - Pre/post-deployment verification

---

## Key File Locations

### Configuration Files

- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `middleware.ts` - Route protection middleware
- `vitest.config.ts` - Test configuration
- `wrangler.toml` - Cloudflare Workers configuration
- `.env.example` - Environment variables template
- `.env.production.template` - Production environment template

### Database Layer

- `lib/db/client.ts` - Database client singleton
- `lib/db/schemas.ts` - Zod validation schemas
- `lib/db/repositories.ts` - Repository pattern implementation
- `lib/db/utils.ts` - Database utilities and helpers
- `migrations/v_1_init_schema.sql` - Initial database schema

### Authentication

- `src/lib/auth/config.ts` - NextAuth configuration
- `src/lib/auth/hooks.ts` - Auth hooks for client components
- `src/lib/auth/server.ts` - Server-side auth utilities
- `middleware.ts` - Route protection

### Business Logic

- `src/lib/db/credit-engine.ts` - Credit calculation logic
- `src/lib/db/credit-utils.ts` - Credit utilities
- `src/lib/audit/logger.ts` - Audit logging system
- `src/lib/storage/r2-client.ts` - Cloudflare R2 client
- `src/lib/features/flags.ts` - Feature flag management

### API Routes

- `src/app/api/practitioners/` - Practitioner management
- `src/app/api/submissions/` - Activity submissions
- `src/app/api/users/` - User management
- `src/app/api/audit/` - Audit log access
- `src/app/api/backup/` - Evidence backup system
- `src/app/api/files/` - File upload/download

### UI Components

- `src/components/ui/` - Base glasscn-ui components
- `src/components/forms/` - Form components
- `src/components/dashboard/` - Dashboard components
- `src/components/practitioners/` - Practitioner management UI
- `src/components/submissions/` - Activity submission UI
- `src/components/audit/` - Audit log viewer

### Documentation

- `CLAUDE.md` - This file (AI assistant guide)
- `AGENTS.md` - AI agent guidelines (legacy)
- `WARP.md` - WARP.dev integration guide
- `README.md` - Project README
- `CHANGELOG.md` - Change history
- `openspec/project.md` - OpenSpec conventions
- `docs/` - Additional documentation

### Scripts

- `scripts/test-*.ts` - Database testing scripts
- `scripts/seed-*.ts` - Data seeding scripts
- `scripts/verify-*.ts` - Verification scripts
- `scripts/run-migration-*.ts` - Migration scripts

---

## Additional Resources

### MCP Tool Prioritization (from WARP.md)

When working with this codebase:

1. **Database Exploration** → **Neon MCP Tools**
   - `describe_project`, `describe_branch`, `describe_table_schema`
   - `get_database_tables`, `list_branches`, `run_sql`

2. **Codebase Exploration** → **gkg MCP Tools**
   - `search_codebase_definitions`, `get_references`
   - `read_definitions`, `repo_map`

3. **Reasoning & Decisions** → **human MCP Tools**
   - `brain_analyze_simple`, `brain_reflect_enhanced`
   - `sequentialthinking`

**General Principle:** Use the most specialized tool for the task.

### Design System

**Glassmorphism Components:**
- Semi-transparent backgrounds: `rgba(255, 255, 255, 0.25)`
- Backdrop blur: `blur(12px)`
- Border: `rgba(255, 255, 255, 0.3)`
- Border radius: `0.75rem`

**Healthcare Color Palette:**
```css
--medical-blue: #0066CC;      /* Primary actions */
--medical-green: #00A86B;     /* Success states */
--medical-amber: #F59E0B;     /* Warnings */
--medical-red: #DC2626;       /* Critical errors */
```

### Evidence Backup Operations

**UI:** `/so-y-te/backup` (SoYTe role only)

**Endpoints:**
- `POST /api/backup/evidence-files` - Stream ZIP with manifest and enforce file-count safeguards
- `GET /api/backup/dashboard` - Metrics for dashboard
- `POST /api/backup/delete-archived` - Cleanup with safeguards

**Documentation:**
- `openspec/changes/add-evidence-backup-and-cleanup/docs/user-guide.md`
- `openspec/changes/add-evidence-backup-and-cleanup/docs/admin-guide.md`
- `openspec/changes/add-evidence-backup-and-cleanup/design.md`

### Audit Logging System

**Access:** Navigate to `/audit` (requires SoYTe or Auditor role)

**Features:**
- Track all data modifications (CREATE, UPDATE, DELETE)
- User authentication events (login/logout)
- File operations (upload/download)
- Activity approvals/rejections
- CSV export for external analysis
- SHA-256 checksums for file integrity

**Documentation:** `docs/audit-system.md`

---

## Best Practices Summary

### DO ✅

- Bootstrap superpowers each session by running `~/.codex/superpowers/.codex/superpowers-codex bootstrap` and applying its guidance
- Use TodoWrite tool for multi-step tasks
- Follow OpenSpec workflow for significant changes
- Use Conventional Commits format for all commit messages
- Use repositories - never raw SQL in components
- Parameterize all database queries
- Validate with Zod before database operations
- Hash passwords with bcryptjs
- Enforce tenant isolation for DonVi role
- Log mutations to NhatKyHeThong
- Use TypeScript strict mode - no `any` types
- Use `@/*` path aliases for imports
- Follow glassmorphism design system
- Test with `npm run test` before committing
- Run `npm run check` before pushing
- Create proposals for significant changes
- Mark todos completed immediately after finishing
- Use Workers-compatible libraries only

### DON'T ❌

- Don't use `any` types
- Don't concatenate strings in SQL queries
- Don't run `npm run lint` after finishing tasks unless it is explicitly requested
- Don't use native bcrypt (use bcryptjs)
- Don't skip authentication checks
- Don't forget tenant filtering for DonVi role
- Don't expose sensitive data in errors
- Don't implement before proposal approval
- Don't batch todo completions
- Don't skip the OpenSpec validation step
- Don't use node-postgres (use @neondatabase/serverless)
- Don't create files unnecessarily (prefer editing)
- Don't use emojis unless explicitly requested

---

## Questions or Issues?

1. Check this CLAUDE.md first
2. Review `openspec/project.md` for conventions
3. Read relevant specs in `openspec/specs/`
4. Check `docs/` for additional documentation
5. Review recent changes in `openspec/changes/archive/`

**For deployment issues:**
- Check `docs/deployment-guide.md` troubleshooting section
- Run `npm run verify:production` for diagnostics
- Review Cloudflare Pages deployment logs

---

**Last Updated:** 2025-11-14
**Maintained by:** AI Assistants working on CNKTYKLT Platform
**Repository:** https://github.com/thienchi2109/cnktyk
