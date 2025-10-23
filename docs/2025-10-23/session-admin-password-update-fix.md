# Session: Admin User Password Update Fix

**Date**: 2025-10-23  
**Duration**: ~2 hours  
**Focus**: Fix admin password update functionality and authentication flow improvements

---

## Overview

Fixed critical bug where SoYTe admins could not update user passwords through the UI. After updating a password, users could not sign in with the new credentials due to missing password hash update in the database.

---

## Problem Statement

### Initial Report
User reported that after updating a DonVi account password via the admin UI:
1. Update appeared successful (no error displayed)
2. Sign-in with new password failed with "Not authenticated" error
3. Console showed `ClientFetchError` from next-auth

### Root Causes Identified

1. **API Route Issue**: `PUT /api/users/[id]` only accepted `UpdateTaiKhoanSchema` which excluded both `MatKhau` and `MatKhauBam`
2. **Schema Problem**: `UpdateTaiKhoanSchema` didn't include password fields, so password updates were silently ignored
3. **Client Validation**: Form submitted empty password strings causing validation errors
4. **Security Flaw**: `CreateTaiKhoanSchema` included `MatKhauBam`, allowing potential client-side hash injection

---

## Solutions Implemented

### 1. API Route Enhancement (`src/app/api/users/[id]/route.ts`)

**Changes**:
- Extract optional `MatKhau` from request body (outside schema validation)
- Treat empty/whitespace-only passwords as "no change"
- Validate password length (≥6 chars) when provided
- Strip any `MatKhauBam` from client input for security
- Call `taiKhoanRepo.updatePassword()` separately when password provided
- Perform field updates first, then password update
- Fetch and return latest user state after all updates

**Code Pattern**:
```typescript
// Extract optional plain password; treat empty string as undefined
const rawPassword = (body as any)?.MatKhau;
const MatKhau: string | undefined =
  typeof rawPassword === 'string' && rawPassword.trim().length > 0
    ? rawPassword
    : undefined;
if (MatKhau && MatKhau.length < 6) {
  return NextResponse.json(
    { error: 'Password must be at least 6 characters' },
    { status: 400 }
  );
}

// Never accept direct MatKhauBam updates from client for security
const { MatKhauBam, ...safeUpdate } = validatedData as any;

// Perform field updates if provided
if (Object.keys(safeUpdate).length > 0) {
  const result = await taiKhoanRepo.update(userId, safeUpdate);
  if (!result) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// Handle password change if provided
if (MatKhau) {
  await taiKhoanRepo.updatePassword(userId, MatKhau);
}
```

### 2. Client Form Fix (`src/components/forms/user-form.tsx`)

**Changes**:
- Omit `MatKhau` from payload when editing and field is empty
- Prevents sending empty password strings that cause validation errors

**Code Pattern**:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitError('');

  if (!validateForm()) {
    return;
  }

  try {
    // Omit empty password on edit to avoid server-side validation errors
    const payload: any = { ...formData };
    if (mode === 'edit' && (!payload.MatKhau || payload.MatKhau.trim() === '')) {
      delete payload.MatKhau;
    }
    await onSubmit(payload as UserFormData);
  } catch (error) {
    setSubmitError(error instanceof Error ? error.message : 'An error occurred');
  }
};
```

### 3. Schema Security Fix (`src/lib/db/schemas.ts`)

**Before**:
```typescript
export const CreateTaiKhoanSchema = TaiKhoanSchema.omit({ 
  MaTaiKhoan: true, 
  TaoLuc: true 
}).extend({
  MatKhau: z.string().min(6, 'Password must be at least 6 characters'),
});
```

**After**:
```typescript
export const CreateTaiKhoanSchema = TaiKhoanSchema.omit({ 
  MaTaiKhoan: true, 
  TaoLuc: true,
  MatKhauBam: true,  // Security: never accept hash from client
}).extend({
  MatKhau: z.string().min(6, 'Password must be at least 6 characters'),
});
```

### 4. Authentication Improvements (`src/lib/db/repositories.ts`)

**Changes**:
- Added `findByUsernameInsensitive()` method for case-insensitive username lookup
- Updated `verifyPassword()` to trim whitespace and use case-insensitive lookup
- Improved robustness of authentication flow

**Code Pattern**:
```typescript
async findByUsernameInsensitive(username: string): Promise<TaiKhoan | null> {
  return db.queryOne<TaiKhoan>(
    `SELECT * FROM "${this.tableName}" WHERE LOWER("TenDangNhap") = LOWER($1)`, 
    [username]
  );
}

async verifyPassword(username: string, password: string): Promise<TaiKhoan | null> {
  // Normalize username lookup to be case-insensitive and trim whitespace
  const normalized = username.trim();
  const user = await this.findByUsernameInsensitive(normalized);
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.MatKhauBam);
  return isValid ? user : null;
}
```

---

## Testing & Verification

### Manual Testing
1. Created test account "bvnd" with initial password
2. Admin updated password to "123456" via UI
3. Verified database hash was updated using Neon MCP tools:
   ```sql
   SELECT "MaTaiKhoan", "TenDangNhap", "MatKhauBam" 
   FROM "TaiKhoan" 
   WHERE "TenDangNhap" = 'bvnd'
   ```
4. Successfully signed in with new credentials
5. Verified case-insensitive username lookup works

### Database Verification (via Neon MCP)
- Project: `cnktyk-syt` (noisy-sea-78740912)
- Database: `neondb`
- Verified hash format: `$2b$10$...` (bcrypt)
- Confirmed password verification: `bcrypt.compare('123456', hash)` returns `true`

### Typecheck Results
```bash
npm run typecheck
# ✅ 0 errors
```

---

## Technical Details

### Security Considerations

1. **Hash-Only Storage**: Client never sends or receives `MatKhauBam`
2. **Server-Side Hashing**: All password hashing via `bcryptjs` with cost=10
3. **Input Sanitization**: Trim whitespace, validate length, reject empty strings
4. **Type Safety**: Explicit handling of optional password field
5. **Audit Trail**: Password changes logged via existing audit system

### API Contract

**Endpoint**: `PUT /api/users/{id}`

**Request Body** (admin update):
```json
{
  "TenDangNhap": "username",  // optional
  "QuyenHan": "DonVi",        // optional
  "MaDonVi": "uuid",          // optional
  "TrangThai": true,          // optional
  "MatKhau": "newpass123"     // optional, omit to keep current password
}
```

**Response**:
```json
{
  "user": {
    "MaTaiKhoan": "uuid",
    "TenDangNhap": "username",
    "QuyenHan": "DonVi",
    "MaDonVi": "uuid",
    "TrangThai": true,
    "TaoLuc": "2025-10-23T00:00:00Z"
  }
}
```

### Password Update Flow

```
Client Form
    ↓ (omit MatKhau if empty)
API Route
    ↓ (extract & validate MatKhau)
    ├─→ taiKhoanRepo.update() ← field updates
    └─→ taiKhoanRepo.updatePassword() ← hash & update MatKhauBam
        ↓ (bcrypt.hash(password, 10))
Database
    ↓ (UPDATE "TaiKhoan" SET "MatKhauBam" = $1 WHERE "MaTaiKhoan" = $2)
Success Response
```

---

## Files Changed

### Modified Files
- `src/app/api/users/[id]/route.ts` - Admin user update endpoint
- `src/components/forms/user-form.tsx` - User form submission logic
- `src/lib/db/schemas.ts` - Schema security fix
- `src/lib/db/repositories.ts` - Auth normalization
- `docs/2025-10-22/session-bulk-approve-signin-fix.md` - Updated signin fix status

### New Files
- `docs/2025-10-23/session-admin-password-update-fix.md` - This documentation

---

## Related Work

### Previous Session (2025-10-22)
- Fixed signin page flash with direct role navigation
- Added persistent loading overlay during authentication
- Implemented bulk approve functionality for submissions
- Dynamic badge for pending submissions

### Connection
The signin UX improvements from 2025-10-22 helped identify this password update bug, as users were experiencing immediate signin failures after password updates.

---

## Lessons Learned

1. **Schema Design**: Update schemas should explicitly include/exclude fields rather than relying on type assertions
2. **Validation Layers**: Need consistent validation between client, API, and repository layers
3. **Testing Strategy**: Always verify database state after update operations, not just API responses
4. **Security First**: Never accept password hashes from clients; always hash server-side
5. **UX Feedback**: Empty/optional fields need clear handling to avoid confusing validation errors

---

## Follow-up Tasks

### Completed
- [x] Fix admin password update API
- [x] Secure schema to prevent MatKhauBam injection
- [x] Add case-insensitive username lookup
- [x] Test with real database via Neon MCP
- [x] Document session

### Optional Enhancements
- [ ] Add password strength indicator in UI
- [ ] Implement password history to prevent reuse
- [ ] Add "force password change on first login" flag
- [ ] Email notification when password is changed by admin
- [ ] Audit log viewer for password changes

---

## Commit Message

```
fix(users): admin password update now persists and allows signin

- API: Accept optional MatKhau in PUT /api/users/[id]; empty = no change
- API: Strip MatKhauBam from client input; enforce min length ≥6 chars
- API: Call updatePassword() separately when password provided
- Client: Omit empty MatKhau in edit form to avoid validation errors
- Schema: Remove MatKhauBam from CreateTaiKhoanSchema (security)
- Auth: Case-insensitive username lookup with whitespace trimming
- Repo: Add findByUsernameInsensitive() helper method

Verification:
- Tested admin updating DonVi password via UI
- Verified DB hash change via Neon MCP tools
- Confirmed signin works with new credentials
- Typecheck passed (0 errors)

Affects:
- src/app/api/users/[id]/route.ts
- src/components/forms/user-form.tsx
- src/lib/db/schemas.ts
- src/lib/db/repositories.ts
- docs/2025-10-23/session-admin-password-update-fix.md
```

---

## Database Schema Reference

### TaiKhoan Table
```sql
CREATE TABLE "TaiKhoan" (
  "MaTaiKhoan"  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "TenDangNhap" TEXT UNIQUE NOT NULL,
  "MatKhauBam"  TEXT NOT NULL,  -- bcryptjs hash
  "QuyenHan"    quyen_han NOT NULL,
  "MaDonVi"     UUID NULL,
  "TrangThai"   BOOLEAN NOT NULL DEFAULT true,
  "TaoLuc"      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Password Hash Format
- Algorithm: bcrypt
- Library: `bcryptjs` v2.4.3
- Cost factor: 10
- Format: `$2b$10$[22-char-salt][31-char-hash]`
- Example: `$2b$10$iHjHvFqxro9PdtmfN19F4.IsoGNJIaVjbP.8dWfx.RaLM2TtAGMdy`

---

## Session End

**Status**: ✅ Completed  
**Verified**: Admin password updates working correctly  
**Ready for**: Commit and deployment
