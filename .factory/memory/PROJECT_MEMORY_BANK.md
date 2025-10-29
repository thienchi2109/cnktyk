# CNKTYKLT Platform - Memory Bank

**Purpose**: Persistent memory for AI assistants working on this project  
**Last Updated**: January 10, 2025

---

## 🧠 Quick Context (Read This First)

### What is This Project?
**CNKTYKLT Compliance Management Platform** - A Vietnamese healthcare compliance and continuing education tracking system for healthcare practitioners.

### Current State
- ✅ **Code Status**: Production-ready, no errors
- ✅ **Database**: Neon PostgreSQL configured and seeded
- ✅ **File Storage**: Cloudflare R2 configured
- ✅ **Deployment**: Vercel configuration complete
- ⚠️ **Action Needed**: Add environment variables to Vercel UI

### Technology
- **Framework**: Next.js 15.5.2 (App Router, SSR)
- **Language**: TypeScript
- **Database**: Neon PostgreSQL (serverless)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Auth**: NextAuth v5
- **Hosting**: Vercel (Singapore region)

---

## 📁 Critical Files & Their Purpose

### Configuration Files
```
next.config.ts          → Next.js config (Vercel optimized, image remote patterns)
tsconfig.json          → TypeScript config (strict mode enabled)
vercel.json            → Vercel deployment config (region: sin1)
.env.local             → Environment variables (NEVER COMMIT)
middleware.ts          → Auth middleware + RBAC enforcement
package.json           → Dependencies (Next 15.5.2, React 19, NextAuth v5)
```

### Core Application Files
```
src/app/page.tsx                     → Homepage (SSR redirect based on auth)
src/app/layout.tsx                   → Root layout
src/app/(authenticated)/             → Protected routes (require login)
src/app/api/                         → API routes
src/app/api/auth/[...nextauth]/     → NextAuth handler

src/lib/auth.ts                      → NextAuth configuration
src/lib/db/client.ts                 → Database client (singleton pattern)
src/lib/storage/r2-client.ts         → R2 storage client (S3-compatible)

middleware.ts                        → Route protection + RBAC
```

### Documentation Files
```
PROJECT_STATUS.md              → Comprehensive project status (read this!)
VERCEL_DEPLOYMENT.md           → Step-by-step Vercel deployment guide
DEPLOYMENT_CHECKLIST.md        → Interactive deployment checklist
docs/WARP.md                   → Development guide
docs/r2-storage-setup.md       → R2 configuration details
```

---

## 🔑 Environment Variables (Critical!)

### Required for All Environments

```bash
# Authentication (NextAuth)
NEXTAUTH_URL=https://your-deployment-url.vercel.app
NEXTAUTH_SECRET=<generate: openssl rand -base64 32>

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://neondb_owner:npg_wciGYM7AypC8@ep-fragrant-pine-adxuf4ke-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Cloudflare R2 Storage (REQUIRED - not optional!)
CF_R2_ACCOUNT_ID=643c80a3c4819db1be3f8e7174ad8501
CF_R2_ACCESS_KEY_ID=3c7fc058aa8dc59d644cfc796cef9638
CF_R2_SECRET_ACCESS_KEY=7bb161344a5bbb06231608025eefe06dd4f0f29e0d5032c5724b556424be87af
CF_R2_BUCKET_NAME=cnktyklt-syt
CF_R2_ENDPOINT=https://643c80a3c4819db1be3f8e7174ad8501.r2.cloudflarestorage.com
CF_R2_PUBLIC_URL=https://pub-3e9de70adc454c988e484c10a520c045.r2.dev
```

**Where to add**:
- Local: `.env.local` (already configured)
- Vercel: Project Settings → Environment Variables (UI only, not vercel.json!)

---

## 🗄️ Database Schema (Quick Reference)

### Tables
1. **DonVi** - Health units/departments
2. **NguoiDung** - Users (with password hash, role)
3. **NguoiHanhNghe** - Healthcare practitioners
4. **HoatDong** - Activity types (with credit point rules)
5. **GhiNhanHoatDong** - Activity submissions (with evidence files)
6. **DiemTichLuy** - Credit points ledger
7. **ThongBao** - Notifications
8. **NhatKyHeThong** - Audit logs

### Key Relationships
- `NguoiDung.MaDonVi` → `DonVi.MaDonVi`
- `NguoiHanhNghe.MaNguoiDung` → `NguoiDung.MaNguoiDung`
- `GhiNhanHoatDong.MaNguoiHanhNghe` → `NguoiHanhNghe.MaNguoiHanhNghe`
- `DiemTichLuy.MaNguoiHanhNghe` → `NguoiHanhNghe.MaNguoiHanhNghe`

### Database Client Usage
```typescript
import { db } from '@/lib/db/client';

// Query
const users = await db.query('SELECT * FROM "NguoiDung"');

// Insert
const user = await db.insert('NguoiDung', { TenDangNhap: 'test', ... });

// Update
await db.update('NguoiDung', { TenHienThi: 'New Name' }, { MaNguoiDung: '123' });
```

---

## 📦 File Storage (R2) Quick Reference

### R2 Client Usage
```typescript
import { r2Client } from '@/lib/storage/r2-client';

// Upload file
const result = await r2Client.uploadFile(file, 'evidence/uuid.pdf', {
  originalName: file.name,
  activityId: '123',
  checksum: '...'
});

// Get signed URL (temporary access)
const signedUrl = await r2Client.getSignedUrl('evidence/uuid.pdf', 3600);

// Delete file
await r2Client.deleteFile('evidence/uuid.pdf');

// Check configuration
if (!r2Client.isR2Configured()) {
  console.error('R2 not configured!');
}
```

### R2 Bucket Details
- **Name**: `cnktyklt-syt`
- **Region**: Asia-Pacific (APAC)
- **Public URL**: `https://pub-3e9de70adc454c988e484c10a520c045.r2.dev`
- **Size**: ~0 GB (currently empty)

### Important Notes
- R2 is **REQUIRED** for file features (not optional)
- Public dev URL is rate-limited (need custom domain for production)
- Files are public by default (no signed URLs needed for downloads)

---

## 🔒 Authentication & Roles

### NextAuth Setup
- **Provider**: Credentials (username/password)
- **Session**: JWT-based
- **Protection**: `middleware.ts` handles route protection

### User Roles
```typescript
type Role = 'SoYTe' | 'DonVi' | 'NguoiHanhNghe' | 'Auditor';
```

1. **SoYTe** (Department of Health) - Full access
2. **DonVi** (Unit Admin) - Manage unit practitioners
3. **NguoiHanhNghe** (Practitioner) - Submit activities, view credits
4. **Auditor** - View audit logs only

### Protected Routes
```typescript
// middleware.ts defines protected routes
const PROTECTED_ROUTES = {
  "/dashboard": ["SoYTe", "DonVi", "NguoiHanhNghe", "Auditor"],
  "/practitioners": ["SoYTe", "DonVi", "NguoiHanhNghe"],
  "/activities": ["SoYTe", "DonVi"],
  "/users": ["SoYTe", "DonVi"],
  // ...
};
```

### Getting Current User
```typescript
import { auth } from '@/lib/auth';

// In Server Component
const session = await auth();
const user = session?.user;

// In API Route
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });
  // ...
}
```

---

## 🐛 Known Issues & Solutions

### Issue 1: "fetchConnectionCache is deprecated"
**Status**: ✅ Fixed  
**Solution**: Already removed from `src/lib/db/client.ts` and `lib/db/client.ts`  
**Do NOT add back**: `neonConfig.fetchConnectionCache = true`

### Issue 2: "Environment Variable references Secret which does not exist"
**Status**: ✅ Fixed  
**Cause**: `vercel.json` had `@secret` references  
**Solution**: Removed `env` object from `vercel.json`. Use Vercel UI instead.

### Issue 3: 401 Errors on `/api/auth/session`
**Status**: ✅ Expected behavior (not an error)  
**Explanation**: Returns 401 when not logged in - this is normal  
**After login**: Returns 200 with session data

### Issue 4: R2 Dev URL Rate Limiting
**Status**: ⚠️ Known limitation  
**Impact**: File downloads may be slow under high load  
**Solution**: Set up custom domain for R2 in production  
**Action**: Configure in Cloudflare R2 dashboard

### Issue 5: Duplicate lib/ folder
**Status**: ⚠️ Intentional (for now)  
**Reason**: Both `src/lib/` and `lib/` exist  
**Action**: Keep in sync when making changes  
**Future**: Consider consolidating to `src/lib/` only

---

## 🚀 Deployment (Vercel)

### Current Status
- ✅ Code is production-ready
- ✅ `vercel.json` configured (Singapore region)
- ✅ Build succeeds locally
- ⚠️ Environment variables need to be added via Vercel UI

### Deployment Steps
1. **Push to GitHub** → Auto-deploys to Vercel
2. **Add env vars** in Vercel UI (NOT in vercel.json!)
3. **Redeploy** after adding variables
4. **Update `NEXTAUTH_URL`** with actual Vercel URL
5. **Redeploy again**
6. **Test file upload** at `/files/demo`

### Vercel Configuration
```json
// vercel.json
{
  "framework": "nextjs",
  "regions": ["sin1"]  // Singapore - closest to Vietnam
}
```

### Build Commands
```bash
# Build command (Vercel auto-detects)
npm run build

# Output directory (Vercel auto-detects)
.next/
```

### Auto-Deployment
- **Production**: `main` branch → `https://cnktyk.vercel.app`
- **Preview**: Other branches → `https://cnktyk-git-[branch].vercel.app`

---

## 🛠️ Common Development Tasks

### Start Development Server
```bash
npm run dev
# Access: http://localhost:3000
```

### Build for Production
```bash
npm run build          # Build with Turbopack
npm start             # Start production server
```

### Check for Errors
```bash
npm run typecheck     # TypeScript errors
npm run lint          # ESLint errors
npm run check         # Both typecheck + lint
```

### Database Tasks
```bash
npm run seed:production       # Seed database with initial data
npm run verify:production     # Verify database connection
```

### View Logs (After Deploying to Vercel)
```bash
vercel logs --follow          # Real-time logs
```

---

## 🔧 Troubleshooting Guide

### Problem: Build fails
**Check**:
1. Run `npm run typecheck` - any TS errors?
2. Run `npm run lint` - any linting errors?
3. Run `npm run build` locally - does it succeed?
4. Check Vercel build logs for specific error

### Problem: Database connection errors
**Check**:
1. Is `DATABASE_URL` set correctly?
2. Does it include `?sslmode=require`?
3. Test with `npm run verify:production`
4. Check Neon dashboard for database status

### Problem: R2 uploads fail
**Check**:
1. Are ALL 6 R2 env vars set?
2. No extra spaces or quotes in variables?
3. Test locally: `wrangler r2 object list cnktyklt-syt`
4. Check Cloudflare R2 dashboard

### Problem: Authentication not working
**Check**:
1. Is `NEXTAUTH_URL` set to actual deployment URL?
2. Is `NEXTAUTH_SECRET` at least 32 characters?
3. Did you redeploy after adding/changing env vars?
4. Check browser console for errors

### Problem: Files upload but can't download
**Check**:
1. Is R2 public access enabled?
2. Test public URL directly: `https://pub-3e9de70adc454c988e484c10a520c045.r2.dev/[filename]`
3. Check CORS configuration in R2 dashboard
4. Look for CORS errors in browser console

---

## 📋 Code Patterns & Conventions

### Component Structure
```typescript
// Server Component (default in App Router)
export default async function Page() {
  const session = await auth();  // Can use await
  return <div>...</div>;
}

// Client Component (needs 'use client')
'use client';
export default function ClientComponent() {
  const [state, setState] = useState();  // Can use hooks
  return <div>...</div>;
}
```

### API Route Pattern
```typescript
// src/app/api/[resource]/route.ts
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';

export async function GET(req: Request) {
  // 1. Check authentication
  const session = await auth();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Check authorization (role)
  const allowedRoles = ['SoYTe', 'DonVi'];
  if (!allowedRoles.includes(session.user.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Execute query
  try {
    const data = await db.query('SELECT * FROM "Resource"');
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Database Query Pattern
```typescript
// Use parameterized queries (prevent SQL injection)
const data = await db.query(
  'SELECT * FROM "Users" WHERE "MaNguoiDung" = $1',
  [userId]
);

// Use helper methods for common operations
const user = await db.queryOne('SELECT * FROM "Users" WHERE "MaNguoiDung" = $1', [id]);
const users = await db.query('SELECT * FROM "Users"');
await db.insert('Users', { TenDangNhap: 'test', ... });
await db.update('Users', { TenHienThi: 'New' }, { MaNguoiDung: '123' });
```

---

## 📚 Resources & References

### Official Documentation
- **Next.js 15**: https://nextjs.org/docs
- **NextAuth v5**: https://authjs.dev/getting-started
- **Neon**: https://neon.tech/docs
- **Cloudflare R2**: https://developers.cloudflare.com/r2/
- **Vercel**: https://vercel.com/docs

### Project Documentation
- **Project Status**: `PROJECT_STATUS.md`
- **Deployment Guide**: `VERCEL_DEPLOYMENT.md`
- **Deployment Checklist**: `DEPLOYMENT_CHECKLIST.md`
- **Development Guide**: `docs/WARP.md`
- **R2 Setup**: `docs/r2-storage-setup.md`

### Key Commands Reference
```bash
# Development
npm run dev               # Start dev server
npm run build            # Production build
npm start                # Start production server

# Quality Checks
npm run typecheck        # Check TypeScript
npm run lint             # Run ESLint
npm run check            # Both checks

# Database
npm run seed:production     # Seed database
npm run verify:production   # Verify connection

# Deployment
git push origin main        # Deploy to production
vercel logs --follow        # View logs
```

---

## 🎯 Project Goals & Context

### Purpose
Track continuing education and compliance for healthcare practitioners in Vietnam.

### Key Features
1. **Activity Submission** - Practitioners submit evidence of continuing education
2. **Credit Calculation** - Automatic credit points based on activity type
3. **Compliance Tracking** - Dashboard showing compliance status
4. **Role-Based Access** - Different views for administrators, units, and practitioners
5. **File Management** - Evidence file upload/storage via R2
6. **Audit Trail** - System logs for compliance auditing

### User Workflow
1. Practitioner logs in → Dashboard
2. Submits activity with evidence file
3. File uploads to R2 storage
4. Credits automatically calculated
5. Unit admin reviews submissions
6. Department of Health generates reports

---

## ⚠️ Important Reminders

### Before Making Changes
1. ✅ Read `PROJECT_STATUS.md` for current state
2. ✅ Check "Recent Changes" section
3. ✅ Review known issues before debugging
4. ✅ Test locally before pushing to GitHub

### When Working with Database
1. ⚠️ Always use parameterized queries (prevent SQL injection)
2. ⚠️ Wrap table/column names in double quotes: `"TableName"`
3. ⚠️ Include `?sslmode=require` in DATABASE_URL
4. ⚠️ No migration system - document schema changes

### When Working with R2
1. ⚠️ R2 is REQUIRED (not optional) - app won't work without it
2. ⚠️ All 6 env vars must be set
3. ⚠️ Dev URL is rate-limited (custom domain for production)
4. ⚠️ Files are public by default

### When Working with Authentication
1. ⚠️ `NEXTAUTH_URL` must match deployment URL exactly
2. ⚠️ `NEXTAUTH_SECRET` must be 32+ characters
3. ⚠️ Always redeploy after changing auth variables
4. ⚠️ 401 on `/api/auth/session` is normal when not logged in

### When Deploying to Vercel
1. ⚠️ Add env vars via UI (NOT vercel.json)
2. ⚠️ Must redeploy after adding/changing variables
3. ⚠️ Update `NEXTAUTH_URL` after first deploy
4. ⚠️ Test file upload at `/files/demo` after deployment

---

## 🔄 Session Continuity

### If Starting a New Session
1. Read this file first (`PROJECT_MEMORY_BANK.md`)
2. Read `PROJECT_STATUS.md` for detailed status
3. Check "Recent Changes" section
4. Review "Next Steps" for pending tasks

### If Continuing Previous Work
1. Check "Recent Changes" in `PROJECT_STATUS.md`
2. Review any uncommitted changes: `git status`
3. Check if environment has changed
4. Verify local build still works: `npm run build`

### If User Reports an Issue
1. Check "Known Issues" section first
2. Check "Troubleshooting Guide"
3. Review related code in "Critical Files"
4. Test locally to reproduce

### Before Ending Session
1. Update "Recent Changes" in `PROJECT_STATUS.md`
2. Update "Next Steps" if priorities changed
3. Document any new issues in "Known Issues"
4. Commit and push changes to GitHub

---

## 📊 Quick Stats

- **Total Files**: ~100+
- **Total Dependencies**: 591 packages
- **Build Time**: ~13-15 seconds
- **Build Size**: ~158 KB First Load JS
- **Database Tables**: 8
- **API Routes**: 20+
- **User Roles**: 4
- **R2 Bucket Size**: ~0 GB (empty)

---

## 🎓 Learning Resources

### Understanding the Stack
- **Next.js App Router**: Different from Pages Router - Server Components by default
- **NextAuth v5**: Beta version - API changed from v4
- **Neon**: Serverless Postgres - no manual connection management
- **R2**: S3-compatible - use AWS SDK for S3

### Common Pitfalls
1. Forgetting `'use client'` directive for components using hooks
2. Not using `await` for Server Components
3. SQL injection by not using parameterized queries
4. Missing quotes around table names in SQL
5. Not redeploying after changing environment variables

---

**Last Updated**: January 10, 2025  
**By**: AI Assistant  
**Session**: Deployment Configuration & Documentation

**Status**: ✅ Ready for Vercel Deployment  
**Next Action**: Add environment variables to Vercel UI

---

**End of Memory Bank**
