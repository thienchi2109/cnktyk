# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**CNKTYKLT Compliance Management Platform** - A healthcare compliance tracking system for managing Continuing Professional Development (CPD) credits for Vietnamese healthcare practitioners. Tracks activities, approvals, and 5-year cycle compliance across Department of Health and healthcare units.

**Tech Stack:**
- Next.js 15.5.4 (App Router) with React 19 and TypeScript
- Neon PostgreSQL (serverless, @neondatabase/serverless)
- NextAuth.js v5 (beta) with JWT sessions and bcryptjs
- Cloudflare R2 for file storage
- TailwindCSS 4.0 with glasscn-ui components
- Zod for validation
- Target deployment: Cloudflare Workers + Pages

## Common Commands

### Development
```powershell
# Start dev server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run TypeScript type checking
npm run typecheck

# Run ESLint (warnings only)
npm run lint

# Run both typecheck and lint
npm run check
```

### Database Testing
```powershell
# Test database connection
npx tsx scripts/test-database.ts

# Test all repositories
npx tsx scripts/test-repositories.ts

# Test core functionality
npx tsx scripts/test-core-functionality.ts

# Run complete system test
npx tsx scripts/test-complete-system.ts
```

### Database Utilities
Apply initial schema migration:
```powershell
# Connect to Neon and run v_1_init_schema.sql manually via psql or Neon SQL editor
```

## Architecture

### Multi-Tenant Role-Based System

**Four User Roles:**
1. **SoYTe** (Department of Health) - Full system access across all units
2. **DonVi** (Unit Admin) - Access to their unit's data only
3. **NguoiHanhNghe** (Practitioner) - Access to own activity records
4. **Auditor** - Read-only access for compliance auditing

**Data Isolation:** Application-level enforcement via `WHERE` clauses (RLS disabled). Unit admins can only access `WHERE MaDonVi = :jwt.maDonVi`.

### Database Layer Architecture

Located in `src/lib/db/`:

- **client.ts** - `DatabaseClient` class with Neon serverless driver
  - Lazy-initialized singleton pattern via Proxy
  - Methods: `query()`, `queryOne()`, `insert()`, `update()`, `delete()`, `paginate()`, `exists()`, `count()`
  - All queries use parameterized placeholders (`$1`, `$2`, etc.)

- **schemas.ts** - Zod validation schemas for all entities
  - Runtime validation + TypeScript type generation
  - Exports: `TaiKhoan`, `NhanVien`, `GhiNhanHoatDong`, `DonVi`, `DanhMucHoatDong`, `QuyTacTinChi`, `ThongBao`, `NhatKyHeThong`
  - Create/Update variant schemas (e.g., `CreateTaiKhoan`, `UpdateNhanVien`)

- **repositories.ts** - Repository pattern implementation
  - `BaseRepository<T, CreateT, UpdateT>` abstract class
  - Specialized repositories: `TaiKhoanRepository`, `NhanVienRepository`, `GhiNhanHoatDongRepository`, etc.
  - Business logic: password hashing, activity credit calculation, compliance tracking

- **utils.ts** - Database utilities and helpers
  - `authenticateUser(username, password)` - Returns auth result with user object
  - `hashPassword()`, `verifyPassword()` 
  - Audit logging helpers

- **migrations.ts** - Migration utilities (manual schema execution for now)

### Authentication Flow

**NextAuth.js Configuration** (`src/lib/auth/`):

1. **config.ts** - NextAuth configuration
   - Credentials provider with Zod validation
   - JWT strategy (5-min token, 2-hour session)
   - Custom session includes: `{ id, username, role, unitId }`
   - Session expiry check in callbacks

2. **middleware.ts** - Route protection at root level
   - `PROTECTED_ROUTES` object maps paths to allowed roles
   - Redirects to role-specific dashboards on unauthorized access
   - `/so-y-te/*` → SoYTe only, `/don-vi/*` → SoYTe + DonVi, etc.

3. **Security:**
   - Passwords hashed with bcryptjs (cost=10) - Workers compatible
   - JWT tokens contain: `{ sub, role, unitId, username, sessionStart }`
   - Token refreshed on each request to extend 5-min expiry
   - Session times out after 2 hours regardless of activity

### File Structure Convention

```
src/
├── app/
│   ├── (auth)/            # Auth routes (signin, error)
│   ├── dashboard/         # Generic dashboard
│   ├── so-y-te/          # DoH admin routes
│   ├── don-vi/           # Unit admin routes
│   ├── nguoi-hanh-nghe/  # Practitioner routes
│   ├── api/              # API routes
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles + healthcare theme
├── components/
│   ├── ui/               # Base glasscn-ui components
│   ├── auth/             # Auth-specific components
│   ├── forms/            # Form components
│   ├── dashboard/        # Dashboard components
│   └── layout/           # Layout components
├── lib/
│   ├── auth/             # NextAuth config and hooks
│   ├── db/               # Database layer (complete)
│   └── utils/            # General utilities (cn.ts)
└── types/
    └── index.ts          # Shared TypeScript types
```

### Database Schema Overview

**8 Core Tables** (Vietnamese column names, no diacritics):

1. **DonVi** - Healthcare units hierarchy
   - `MaDonVi` (UUID PK), `TenDonVi`, `CapQuanLy` (enum: SoYTe/BenhVien/TrungTam/PhongKham)
   - Self-referencing: `MaDonViCha` (parent unit)

2. **TaiKhoan** - User accounts
   - `MaTaiKhoan` (UUID PK), `TenDangNhap` (unique), `MatKhauBam` (bcrypt hash)
   - `QuyenHan` (enum: SoYTe/DonVi/NguoiHanhNghe/Auditor), `MaDonVi` (FK)

3. **NhanVien** - Healthcare practitioners
   - `MaNhanVien` (UUID PK), `HoVaTen`, `SoCCHN` (license ID, unique), `NgayCapCCHN`
   - `MaDonVi` (FK), `TrangThaiLamViec` (enum: DangLamViec/DaNghi/TamHoan)

4. **GhiNhanHoatDong** - CPD activity entries
   - `MaGhiNhan` (UUID PK), `MaNhanVien` (FK), `MaDanhMuc` (FK to catalog)
   - `SoGio`, `SoTinChiQuyDoi` (converted credits)
   - `FileMinhChungUrl`, `FileMinhChungETag`, `FileMinhChungSha256` (evidence file)
   - `TrangThaiDuyet` (enum: ChoDuyet/DaDuyet/TuChoi), `ThoiGianDuyet`
   - `CreatedAt`, `UpdatedAt` (auto-updated via trigger)

5. **DanhMucHoatDong** - Activity catalog
   - `MaDanhMuc` (UUID PK), `LoaiHoatDong` (enum: KhoaHoc/HoiThao/NghienCuu/BaoCao)
   - `DonViTinh` (enum: gio/tiet/tin_chi), `TyLeQuyDoi` (conversion rate)
   - `GioToiThieu`, `GioToiDa` (min/max hours), `YeuCauMinhChung`

6. **QuyTacTinChi** - Credit rules engine
   - `MaQuyTac` (UUID PK), `TongTinChiYeuCau` (default 120), `ThoiHanNam` (default 5)
   - `TranTheoLoai` (JSONB) - category caps: `{"KhoaHoc": 80, "HoiThao": 40}`

7. **ThongBao** - Notifications
   - `MaThongBao` (UUID PK), `MaNguoiNhan` (FK to TaiKhoan), `ThongDiep`, `LienKet`
   - `TrangThai` (enum: Moi/DaDoc)

8. **NhatKyHeThong** - Audit log
   - `MaNhatKy` (UUID PK), `MaTaiKhoan` (FK), `HanhDong`, `Bang`, `KhoaChinh`
   - `NoiDung` (JSONB), `DiaChiIP`

**Key Indexes:**
- `GhiNhanHoatDong(MaNhanVien, ThoiGianBatDau DESC)` - Activity timeline
- `GhiNhanHoatDong(TrangThaiDuyet)` - Approval workflow queries
- `NhanVien(MaDonVi, TrangThaiLamViec)` - Active practitioners by unit
- Partial index on `GhiNhanHoatDong` for pending approvals only

## Design System

### Glassmorphism Healthcare Theme

**Color Palette** (defined in `globals.css`):
- **Medical Blue** `#0066CC` - Primary actions, navigation
- **Medical Green** `#00A86B` - Success, approvals
- **Medical Amber** `#F59E0B` - Warnings, alerts
- **Medical Red** `#DC2626` - Critical errors

**Glass Components** (`src/components/ui/`):
- `GlassCard` - Semi-transparent cards with backdrop blur
- `GlassButton` - Interactive buttons with glass effects
- `GlassInput` - Form inputs with glass styling
- All use `backdrop-filter: blur(12px)` and `rgba(255, 255, 255, 0.25)` backgrounds

**CSS Custom Properties:**
```css
--glass-light: rgba(255, 255, 255, 0.25)
--glass-border: rgba(255, 255, 255, 0.3)
--backdrop-blur-md: blur(12px)
--radius: 0.75rem
```

## Business Logic

### Credit Calculation Algorithm

```typescript
// Input: ghiNhan (activity), danhMuc (catalog), quyTac (rules)
if (ghiNhan.SoTinChiQuyDoi !== null) {
  // Manual override - use as-is
  return ghiNhan.SoTinChiQuyDoi;
} else if (danhMuc.DonViTinh === 'gio') {
  // Auto-convert: hours * conversion rate
  return ghiNhan.SoGio * danhMuc.TyLeQuyDoi;
}
// Apply category caps from quyTac.TranTheoLoai at cycle level
```

### 5-Year Compliance Cycle

```typescript
// Per practitioner
const cycleStart = nhanVien.NgayCapCCHN; // License issue date
const cycleEnd = cycleStart + 5 years;
const totalCredits = SUM(SoTinChiQuyDoi) WHERE ThoiGianBatDau IN [cycleStart, cycleEnd];
const progress = (totalCredits / quyTac.TongTinChiYeuCau) * 100; // Target: 120 credits
```

### Alert Thresholds

**In-app warnings generated by daily cron:**
- **Yellow (70%)**: When progress < 70% and 6/3 months remain
- **Red (90%)**: When progress < 90% and 1 month remains

## Development Guidelines

### TypeScript Strict Mode

- **No `any` types** - Create proper interfaces or use `unknown`
- All functions have explicit return types
- Props validated with proper interfaces
- Enable `strict: true` in tsconfig.json

### Database Operations

**Always use repositories:**
```typescript
import { TaiKhoanRepository, NhanVienRepository } from '@/lib/db/repositories';

const taiKhoanRepo = new TaiKhoanRepository();
const user = await taiKhoanRepo.findByUsername(username);
```

**Never write raw SQL directly in components** - Use repository methods or add new methods to repositories.

### Security Patterns

1. **Password Handling:**
   ```typescript
   // ALWAYS hash with bcryptjs (Workers compatible)
   const hashedPassword = await bcrypt.hash(password, 10);
   ```

2. **Tenant Isolation:**
   ```typescript
   // For DonVi role, always filter by unit:
   WHERE "MaDonVi" = req.auth.user.unitId
   ```

3. **Input Validation:**
   ```typescript
   // Validate with Zod before DB operations
   const validated = CreateNhanVienSchema.parse(data);
   ```

4. **Audit Logging:**
   ```typescript
   // Log all mutations to NhatKyHeThong
   await auditLog({
     MaTaiKhoan: session.user.id,
     HanhDong: 'CREATE',
     Bang: 'NhanVien',
     NoiDung: { data }
   });
   ```

### API Route Pattern

```typescript
// app/api/[resource]/route.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Role check
  if (session.user.role !== 'SoYTe') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Tenant filter for non-global roles
  const whereClause = session.user.role === 'DonVi' 
    ? `WHERE "MaDonVi" = '${session.user.unitId}'`
    : '';

  // Use repository
  const repo = new ResourceRepository();
  const data = await repo.findAll();

  return NextResponse.json(data);
}
```

## Environment Variables

Required variables (see `.env.example`):

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."  # For migrations

# Authentication
NEXTAUTH_SECRET="generated-secret"
NEXTAUTH_URL="http://localhost:3000"

# Cloudflare R2 (Evidence Files)
CLOUDFLARE_R2_ACCESS_KEY_ID="..."
CLOUDFLARE_R2_SECRET_ACCESS_KEY="..."
CLOUDFLARE_R2_BUCKET_NAME="cnktyklt-evidence-files"
CLOUDFLARE_R2_ENDPOINT="https://....r2.cloudflarestorage.com"
CLOUDFLARE_R2_PUBLIC_URL="https://files.example.com"
```

## Deployment Considerations

### Cloudflare Workers Compatibility

- **Use `@neondatabase/serverless`** (not node-postgres) for database
- **Use `bcryptjs`** (not native bcrypt) for password hashing
- **Edge runtime compatible** - No Node.js-specific APIs unless marked `runtime = 'nodejs'`
- **R2 file uploads** via API routes (stream to R2, return URL)

### Performance Optimizations

- Connection caching enabled: `neonConfig.fetchConnectionCache = true`
- Pagination for large result sets: Use `db.paginate()`
- Indexes already defined in schema - leverage them in queries
- Consider React Query for client-side caching (spec mentions TanStack Query v5)

### Build Targets

Project supports dual deployment:
- **Primary**: Cloudflare Workers + Pages
- **Fallback**: Vercel (requires Node.js runtime for some features)

## Testing Strategy

**Database Tests** (in `scripts/`):
- `test-database.ts` - Connection health and latency
- `test-repositories.ts` - CRUD operations for each repository
- `test-core-functionality.ts` - Business logic (auth, credit calculation)
- `test-complete-system.ts` - Full integration test

**Run all tests:**
```powershell
npx tsx scripts/test-complete-system.ts
```

## Project Status

**Current Phase:** Authentication system implemented, ready for UI development

**Completed:**
- ✅ Database layer with full repository pattern
- ✅ NextAuth.js configuration with role-based middleware
- ✅ Zod validation schemas for all entities
- ✅ Base UI components (glasscn-ui)
- ✅ Project structure and configuration

**Next Steps:**
- Dashboard layouts for each role
- Activity submission forms
- Approval workflows
- File upload integration (R2)
- Compliance tracking views
- Reporting and analytics

## Useful References

- **Spec Document:** `spec_001_cnktyklt_compliance_management_platform (2).md`
- **Database Schema:** `v_1_init_schema.sql`
- **Project State:** `.serena/memories/project-current-state.md`
- **Architecture:** `.serena/memories/database-technical-architecture.md`

## Package Manager

**Use `npm` exclusively** - This project uses npm, not pnpm or yarn.
