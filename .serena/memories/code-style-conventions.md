# Code Style and Conventions

## Naming Conventions

### Database Tables & Columns
- **Language**: Vietnamese without diacritics
- **Case**: PascalCase (e.g., `TaiKhoan`, `MaNhanVien`, `TrangThaiDuyet`)
- **Primary Keys**: `Ma[TableName]` (e.g., `MaTaiKhoan`, `MaDonVi`)
- **Foreign Keys**: Same as referenced primary key

### TypeScript Files
- **Case**: kebab-case for files (e.g., `activity-form.tsx`)
- **Components**: PascalCase (e.g., `ActivityForm`)
- **Utilities**: camelCase (e.g., `formatDate`)

### API Routes
- **Pattern**: RESTful conventions
- **Example**: `/api/practitioners/[id]/route.ts`
- **Methods**: GET (read), POST (create), PUT/PATCH (update), DELETE (delete)

## TypeScript Configuration
- **Strict Mode**: Enabled
- **Target**: ES2017
- **Module**: ESNext with bundler resolution
- **Path Aliases**: `@/*` maps to `./src/*`
- **No Emit**: Type checking only, no JS output

## ESLint Rules
- **Config**: Extends `next/core-web-vitals` and `next/typescript`
- **Warnings**: 
  - `@typescript-eslint/no-explicit-any`
  - `@typescript-eslint/no-unused-vars`
  - `@typescript-eslint/no-empty-object-type`
  - `prefer-const`
- **Ignored Paths**: `node_modules`, `.next`, `out`, `build`, `lib`, `scripts`

## Component Patterns

### Server Components (Default)
- Use by default for pages and layouts
- No `"use client"` directive needed
- Can directly access database and server-side APIs

### Client Components
- Mark with `"use client"` directive at top of file
- Use for interactive elements, hooks, browser APIs
- Suffix with `-client.tsx` for clarity (optional but recommended)

### Glass Components
- Use glasscn-ui components for consistent glassmorphism design
- Base components: `GlassCard`, `GlassButton`, `GlassInput`
- Healthcare color palette: Medical Blue (#0066CC), Medical Green (#00A86B), Medical Amber (#F59E0B), Medical Red (#DC2626)

## File Organization

### Preferred Locations
- **Components**: `src/components/` (new components)
- **Legacy Components**: `components/` (existing, gradually migrate)
- **Pages**: `src/app/` (App Router)
- **API Routes**: `src/app/api/`
- **Utilities**: `lib/` (server-side) or `src/lib/` (client-side)
- **Types**: `types/` (shared TypeScript types)

### Component Organization
- Group by feature or type (ui, forms, dashboard, layout)
- Keep related components together
- Use index files for cleaner imports

## Authentication Patterns
- **Session**: JWT-based with role and unit information
- **Access Control**: App-level enforcement via WHERE clauses (RLS disabled)
- **Middleware**: Route protection in `middleware.ts`
- **Password Hashing**: bcryptjs with cost factor 10

## Database Patterns
- **Repository Pattern**: Use repositories from `lib/db/repositories`
- **Connection**: Singleton client from `lib/db/client.ts`
- **Types**: TypeScript types in `lib/db/schemas.ts` matching database tables
- **Queries**: Parameterized queries to prevent SQL injection

## Error Handling
- **API Responses**: Consistent format with `success` boolean and `data`/`error` fields
- **Validation**: Zod schemas for runtime type validation
- **Client Errors**: Toast notifications for user feedback
- **Server Errors**: Proper logging without information leakage
