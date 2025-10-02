# Technology Stack

## Core Framework

- **Next.js 15**: App Router with React Server Components
- **React 19**: Latest React with concurrent features
- **TypeScript 5**: Strict type checking enabled

## Database & Storage

- **Neon PostgreSQL**: Serverless PostgreSQL database with HTTP driver (`@neondatabase/serverless`)
- **Cloudflare R2**: S3-compatible object storage for evidence files (PDF/JPG/PNG, max 10MB)
- **Database Driver**: Neon serverless driver with connection caching enabled

## Authentication & Security

- **NextAuth.js v5 (Auth.js)**: Credentials provider with JWT sessions
- **bcryptjs**: Password hashing (cost factor: 10) - pure JS implementation for Workers compatibility
- **JWT**: Session tokens containing `sub`, `quyenHan`, `maDonVi` with 8-hour TTL
- **Middleware**: Route protection with role-based access control

## UI & Styling

- **Tailwind CSS 4**: Utility-first CSS framework
- **shadcn/ui**: Base component library with Radix UI primitives
- **glasscn-ui**: Glassmorphism design system components
- **Lucide React**: Icon library
- **class-variance-authority**: Component variant management

## Form Handling & Validation

- **React Hook Form**: Form state management
- **Zod**: Runtime type validation and schema definition
- **@hookform/resolvers**: Integration between React Hook Form and Zod

## Development Tools

- **ESLint 9**: Code linting with Next.js config
- **TypeScript Compiler**: Type checking with `noEmit` mode
- **tsx**: TypeScript execution for scripts
- **Turbopack**: Fast bundler for dev and build (via `--turbopack` flag)

## Deployment Target

- **Cloudflare Pages + Workers**: Hosting and serverless functions
- **CDN**: Cloudflare CDN for static assets and caching

## Common Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Production build with Turbopack
npm run build:check      # Full check: typecheck + lint + build
npm start                # Start production server

# Code Quality
npm run typecheck        # TypeScript type checking
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run check            # Run typecheck + lint

# Database Scripts (using tsx)
npx tsx scripts/run-migrations.ts
npx tsx scripts/test-database.ts
npx tsx scripts/test-repositories.ts
npx tsx scripts/test-core-functionality.ts
npx tsx scripts/test-complete-system.ts
```

## Environment Variables

Required in `.env.local`:

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Cloudflare R2 (optional)
CLOUDFLARE_R2_ACCESS_KEY_ID="..."
CLOUDFLARE_R2_SECRET_ACCESS_KEY="..."
CLOUDFLARE_R2_BUCKET_NAME="..."
CLOUDFLARE_R2_ENDPOINT="..."
```

## Key Dependencies

- `@neondatabase/serverless`: ^1.0.2
- `next-auth`: ^5.0.0-beta.29
- `bcryptjs`: ^3.0.2
- `zod`: ^4.1.11
- `react-hook-form`: ^7.63.0
- `@aws-sdk/client-s3`: ^3.901.0 (for R2)
