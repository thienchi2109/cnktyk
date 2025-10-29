# Project Structure

## Directory Organization

```
├── .kiro/                      # Kiro IDE configuration
│   ├── specs/                  # Feature specifications (requirements, design, tasks)
│   └── steering/               # AI assistant guidance documents
├── components/                 # Shared UI components (legacy location)
│   ├── dashboard/              # Dashboard-specific components
│   ├── forms/                  # Form components
│   └── layout/                 # Layout components
├── docs/                       # Documentation and SQL files
│   ├── v_1_init_schema.sql    # Database schema migration
│   ├── seed_accounts.sql      # Seed data for testing
│   └── spec_*.md              # Feature specifications
├── lib/                        # Core utilities and libraries
│   ├── auth/                   # Authentication utilities
│   ├── db/                     # Database layer
│   │   ├── client.ts          # Database client with query methods
│   │   ├── connection.ts      # Connection configuration
│   │   ├── repositories.ts    # Repository pattern implementations
│   │   ├── schemas.ts         # TypeScript types for database tables
│   │   └── utils.ts           # Database utility functions
│   ├── utils/                  # General utilities (cn, etc.)
│   └── validations/            # Zod validation schemas
├── scripts/                    # Database and testing scripts
│   ├── run-migrations.ts      # Run database migrations
│   ├── test-database.ts       # Test database connection
│   ├── test-repositories.ts   # Test repository layer
│   └── test-*.ts              # Various test scripts
├── src/                        # Next.js application source
│   ├── app/                    # App Router pages and API routes
│   │   ├── api/                # API route handlers
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── activities/     # Activity management
│   │   │   ├── practitioners/  # Practitioner management
│   │   │   ├── submissions/    # Activity submissions
│   │   │   └── users/          # User management
│   │   ├── auth/               # Auth pages (signin, error)
│   │   ├── dashboard/          # Main dashboard
│   │   ├── activities/         # Activity catalog pages
│   │   ├── practitioners/      # Practitioner management pages
│   │   ├── submissions/        # Submission workflow pages
│   │   ├── profile/            # User profile
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   └── globals.css         # Global styles
│   ├── components/             # React components (preferred location)
│   ├── hooks/                  # Custom React hooks
│   └── lib/                    # Client-side utilities
├── types/                      # Shared TypeScript types
│   └── index.ts                # Type definitions
├── middleware.ts               # Next.js middleware (auth, routing)
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies and scripts
```

## Architecture Patterns

### Database Layer (Repository Pattern)
- **Location**: `lib/db/`
- **Pattern**: Repository pattern with base class and specialized repositories
- **Files**:
  - `client.ts`: Low-level database client with query methods
  - `repositories.ts`: High-level business logic repositories
  - `schemas.ts`: TypeScript types matching database tables
- **Usage**: Import repositories from `lib/db/repositories` (e.g., `taiKhoanRepo`, `nhanVienRepo`)

### API Routes
- **Location**: `src/app/api/`
- **Pattern**: Next.js Route Handlers (App Router)
- **Convention**: Each endpoint in `route.ts` file with HTTP method exports (GET, POST, PUT, DELETE)
- **Authorization**: Check user role from session, apply WHERE clauses for data isolation

### Page Components
- **Location**: `src/app/[feature]/`
- **Pattern**: Server Components by default, Client Components marked with `"use client"`
- **Convention**: 
  - `page.tsx`: Route page component
  - `[id]/page.tsx`: Dynamic route with parameter
  - `*-client.tsx`: Client component suffix for clarity

### Shared Components
- **Primary Location**: `src/components/` (preferred for new components)
- **Legacy Location**: `components/` (existing components, gradually migrate)
- **Organization**: Group by feature or type (ui, forms, dashboard, layout)

### Authentication
- **Configuration**: `lib/auth/` (NextAuth.js setup)
- **Middleware**: `middleware.ts` (route protection)
- **Session**: JWT-based with role and unit information
- **Access Control**: App-level enforcement via WHERE clauses (RLS disabled)

## Key Files
- `middleware.ts`: Authentication and authorization middleware
- `lib/db/client.ts`: Database client singleton
- `lib/db/repositories.ts`: All repository implementations
- `docs/v_1_init_schema.sql`: Complete database schema
- `.env.local`: Environment variables (not in git)
