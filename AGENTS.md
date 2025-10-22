# Agent Guidelines for cnktyklt-platform

## Project Overview
**CNKTYKLT Compliance Management Platform** - Healthcare compliance tracking system for managing CPD credits for Vietnamese healthcare practitioners. Multi-tenant role-based system with 4 user roles: SoYTe (Department of Health), DonVi (Unit Admin), NguoiHanhNghe (Practitioner), Auditor.

## Commands
- **Build**: `npm run build` (uses Turbopack)
- **Lint**: `npm run lint` (ESLint with Next.js config)
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