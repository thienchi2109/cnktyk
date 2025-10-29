# Project Architecture Insights

## Authentication System
- **NextAuth.js v5** with custom session extension
- **Session Structure**: `session.user.{id, role, unitId, username}`
- **Roles**: `SoYTe`, `DonVi`, `NguoiHanhNghe`, `Auditor`
- **Password Hashing**: bcryptjs with cost factor 10 (Workers-compatible)
- **JWT Tokens**: 8-hour TTL with role and unit claims
- **Custom Hooks**: `src/lib/auth/hooks.ts` for role-based access

## Database Architecture
### Repository Pattern
- **Location**: `lib/db/repositories.ts`
- **Pattern**: Base repository class with specialized repositories
- **Repositories**: `taiKhoanRepo`, `nhanVienRepo`, `donViRepo`, `ghiNhanHoatDongRepo`
- **Connection**: Singleton client from `lib/db/client.ts`
- **Types**: TypeScript interfaces in `lib/db/schemas.ts` matching database tables

### Database Design
- **Primary Keys**: UUID-based for all tables
- **Naming**: Vietnamese without diacritics, PascalCase
- **Soft Deletes**: Status flags for user management
- **Audit Trail**: `NhatKyHeThong` table for all modifications
- **Indexes**: Optimized for common query patterns (name search, status filters, time-based queries)

### Key Tables
1. **TaiKhoan**: User accounts with role-based access
2. **NhanVien**: Healthcare practitioners with license tracking
3. **GhiNhanHoatDong**: Activity submissions with evidence files
4. **KyCNKT**: 5-year compliance cycles with credit requirements
5. **DonVi**: Organizational hierarchy (SoYTe → BenhVien → TrungTam → PhongKham)

## API Route Patterns
### Standard Structure
- **Validation**: Zod schemas for all inputs
- **Authorization**: Role-based checks from session
- **Error Handling**: Consistent error response format
- **Response Format**: `{ success: boolean, data?: any, error?: string }`

### Authorization Patterns
- **SoYTe**: Full system access, all units
- **DonVi**: Unit-scoped access via WHERE clauses
- **NguoiHanhNghe**: Self-only access (own practitioner record)
- **Auditor**: Read-only access to all data

### Key Endpoints
- `/api/auth/*` - Authentication
- `/api/system/*` - System-wide metrics (SoYTe only)
- `/api/practitioners/*` - Practitioner management
- `/api/activities/*` - Activity submission and approval
- `/api/dashboard/*` - Role-specific dashboard data

## UI Component System
### Glassmorphism Design
- **Base Components**: `GlassCard`, `GlassButton`, `GlassInput`
- **Library**: glasscn-ui with custom healthcare theme
- **Colors**: Medical Blue (#0066CC), Medical Green (#00A86B), Medical Amber (#F59E0B), Medical Red (#DC2626)
- **Effects**: Backdrop blur, semi-transparent backgrounds, subtle shadows

### Component Organization
- **Primary Location**: `src/components/` (new components)
- **Legacy Location**: `components/` (existing, gradually migrate)
- **Patterns**: Feature-based grouping (dashboard, forms, layout)

### Form Architecture
- **React Hook Form**: Form state management
- **Zod Resolvers**: Type-safe validation
- **Custom Components**: Glass-styled form controls
- **Error Handling**: Inline validation with toast notifications

## Dashboard Architecture
### Adaptive Dashboard System
Role-specific dashboards that automatically adjust content based on user permissions:

1. **Practitioner Dashboard** (`/dashboard/practitioner`)
   - Personal progress tracking
   - Activity submission
   - Alerts and notifications
   - Mobile-first design

2. **Unit Administrator Dashboard** (`/dashboard/unit-admin`)
   - Unit-level management
   - Approval workflow
   - Practitioner oversight
   - Unit analytics

3. **Department of Health Dashboard** (`/dashboard/doh`)
   - System-wide metrics
   - Multi-unit comparison
   - Executive KPIs
   - Cross-unit analytics

### Dashboard Features
- **Real-time Data**: Server-side data fetching with React Server Components
- **Responsive Design**: Mobile, tablet, desktop optimized
- **Search & Filter**: Client-side filtering for performance
- **Glassmorphism**: Consistent healthcare design language
- **Vietnamese Localization**: Complete UI translation

## Build & Development Workflow
### Build Configuration
- **Turbopack**: Fast bundler for dev and production builds
- **TypeScript**: Strict mode enabled, noEmit for type checking
- **ESLint**: Next.js recommended rules with custom overrides
- **Path Aliases**: `@/*` maps to `./src/*`

### Development Commands
- `npm run dev` - Development server with Turbopack
- `npm run build` - Production build
- `npm run build:check` - Full check (typecheck + lint + build)
- `npm run typecheck` - TypeScript type checking
- `npm run lint` - ESLint code quality check

### Testing Strategy
- **Database Scripts**: `npx tsx scripts/test-*.ts`
- **Manual Testing**: Test accounts for each role
- **Type Safety**: TypeScript strict mode catches errors at compile time
- **Validation**: Zod schemas for runtime validation

## Key Technical Decisions
1. **Server Components First**: Default to Server Components for data fetching
2. **Client Components**: Only for interactivity (forms, modals, interactive charts)
3. **Repository Pattern**: Centralized database access layer
4. **Type-First Development**: TypeScript interfaces drive implementation
5. **Role-Based Access**: App-level enforcement via WHERE clauses (RLS disabled)
6. **JWT Sessions**: Stateless authentication with role claims
7. **Glassmorphism**: Modern healthcare-focused design system
8. **Vietnamese Localization**: All UI text in Vietnamese

## Performance Considerations
### Frontend
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **Caching**: TanStack Query with appropriate stale times
- **Glass Effects**: CSS-based backdrop-filter with hardware acceleration

### Backend
- **Database Indexing**: Optimized indexes for common queries
- **Connection Pooling**: Neon's built-in pooling
- **Pagination**: Server-side pagination for large datasets
- **Query Optimization**: Efficient JOINs and aggregations

## Security Patterns
### Authentication & Authorization
- **Password Security**: bcryptjs with cost factor 10
- **Session Management**: HTTP-only, secure cookies
- **JWT Security**: Short-lived tokens with role claims
- **Route Protection**: Middleware-based authorization

### Data Protection
- **Input Sanitization**: Zod validation for all inputs
- **SQL Injection Prevention**: Parameterized queries
- **File Upload Security**: Type validation, size limits, checksums
- **Audit Logging**: Track all data modifications

## Deployment Architecture
### Cloudflare Integration
- **Pages**: Static site hosting with automatic deployments
- **Workers**: API routes running on Cloudflare Workers
- **R2 Storage**: Evidence file storage with CDN
- **DNS & SSL**: Cloudflare-managed

### Environment Configuration
- **Development**: Local with Neon database
- **Staging**: Preview deployments
- **Production**: Production environment with monitoring
