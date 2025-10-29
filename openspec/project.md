# Project Context

## Purpose
- CNKTYKLT Compliance Management Platform: multi-tenant, role-based web app for managing Vietnamese healthcare practitioners’ CPD credits and compliance. Includes submissions and approvals, compliance dashboards, audit logging, and secure evidence file management.

## Tech Stack
- Framework: Next.js 15 (App Router), React 19, TypeScript (strict)
- Styling: Tailwind CSS v4, glasscn-ui components, Radix UI
- State & Forms: TanStack Query v5, React Hook Form + Zod resolver; Zod for runtime validation
- Auth: NextAuth v5 (credentials provider), JWT sessions with role/unit claims
- Database: Neon PostgreSQL (serverless) via @neondatabase/serverless; repository pattern in src/lib/db
- File storage: Cloudflare R2 via AWS SDK v3 (@aws-sdk/client-s3 + presigner)
- Tooling: Turbopack builds, ESLint 9 (next/core-web-vitals), Vitest 2, Vite 5 (tests), tsx for scripts
- Deployment: Cloudflare Pages + Workers (nodejs_compat); Vercel fallback (vercel.json)
- Utilities: date-fns, exceljs, uuid, lucide-react

## Project Conventions

### Code Style
- Imports use '@/*' path aliases; external packages first
- TypeScript strict; avoid any; use Zod schemas for all inputs/outputs
- Client components use "use client" directive
- Naming: PascalCase for components; camelCase for variables/functions
- ESLint: next/core-web-vitals + next/typescript; warn on no-explicit-any, no-unused-vars, no-empty-object-type; prefer-const warn
- Tailwind CSS with glasscn-ui; glassmorphism healthcare theme

### Architecture Patterns
- App Router under src/app with role-based sections; RBAC enforced via middleware.ts and auth helpers
- Database layer in src/lib/db: Neon client, repository pattern, parameterized SQL; Zod schemas in schemas.ts; immutable audit log repository
- Authentication: NextAuth v5 credentials; JWT strategy with role and unitId in token/session; effective session TTL enforced in callbacks
- Storage: R2 client (src/lib/storage/r2-client.ts) for uploads, signed access, and metadata
- API/data mapping utilities in src/lib/api for DB↔type mapping and import/export
- Tenant isolation at application level via WHERE clauses filtered by unitId; SoYTe has global scope

### Testing Strategy
- Vitest (environment: node), tests in tests/**/*.{test,spec}.ts
- Commands: test all (npm run test), watch (npm run test:watch), single file (npm run test -- path)
- CI runs typecheck (tsc --noEmit), lint (eslint), and build on PRs and main
- Prefer unit tests around repositories, mappers, and Zod validations; avoid external network calls

### Git Workflow
- Default branch: main
- Feature branches → PRs into main; GitHub Actions run typecheck/lint/build; PRs auto-deploy preview to Cloudflare Pages; merges to main deploy to production
- Commit style follows Conventional Commits (e.g., feat(scope): message) based on history

## Domain Context
- CPD compliance for Vietnam: 5-year cycles with total credit targets and per-activity rules
- Roles:
  - SoYTe (Department of Health): platform-wide administration
  - DonVi (Unit Admin): manage own unit, approve submissions
  - NguoiHanhNghe (Practitioner): self submissions and profile management
  - Auditor: read-only oversight and audit review
- Core modules: Practitioner directory, Activity catalog, Submissions/approvals, Compliance dashboards, Notifications, Audit logging, Evidence file management

## Important Constraints
- Security: JWT sessions with 2-hour effective TTL; bcryptjs password hashing; parameterized SQL; RBAC in middleware and server
- Multi-tenant isolation via WHERE clauses; DonVi restricted to own unit; SoYTe global access
- Audit logs immutable (no update/delete); mandatory logging for sensitive actions
- File uploads: PDF/JPG/PNG ≤ 10MB; R2 credentials required; signed access for private files; images allowed from *.r2.dev
- TypeScript strict; builds must pass typecheck; ESLint warnings tolerated but should be addressed
- Deployment targets Cloudflare Pages (nodejs_compat)

## External Dependencies
- Neon PostgreSQL (@neondatabase/serverless)
- NextAuth v5 (@auth/core, next-auth)
- Cloudflare R2 (AWS SDK v3: @aws-sdk/client-s3, @aws-sdk/s3-request-presigner)
- TanStack Query, React Hook Form, Zod
- Tailwind CSS v4, Radix UI, glasscn-ui
- date-fns, exceljs, uuid, lucide-react
