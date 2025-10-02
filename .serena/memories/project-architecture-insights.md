# Project Architecture Insights - Build Process

## Authentication System Structure
- **NextAuth.js v5** with custom session extension
- Session structure: `session.user.{id, role, unitId, username}`
- Role-based access control: `SoYTe`, `DonVi`, `NguoiHanhNghe`, `Auditor`
- Custom auth hooks in `src/lib/auth/hooks.ts`

## API Route Patterns
- Consistent error handling with Zod validation
- Role-based authorization middleware
- Repository pattern for database operations
- Standard response format: `{ success: boolean, data?: any, error?: string }`

## Form Architecture
- **React Hook Form** with Zod resolvers
- Custom glass UI components
- Unified error handling patterns
- Type-safe form data with schema inference

## Database Layer
- Repository pattern implementation
- Neon PostgreSQL with connection pooling
- UUID-based primary keys
- Soft delete patterns for user management

## UI Component System
- **Glassmorphism design** with custom components
- Consistent styling with Tailwind CSS
- Accessible form components
- Loading states and error boundaries

## Build & Development Workflow
- **Turbopack** for faster builds
- Separate dev/prod build configurations
- TypeScript strict mode enabled
- ESLint with Next.js recommended rules

## Key Technical Decisions
1. **Server Components** for data fetching
2. **Client Components** for interactivity
3. **Suspense boundaries** for loading states
4. **Type-first development** with TypeScript
5. **Repository pattern** for data access