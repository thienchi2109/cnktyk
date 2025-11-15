# Spec Delta: user-management

**Change ID:** `add-evidence-backup-and-cleanup`  
**Change Type:** MODIFIED  
**Affected Specification:** `user-management`

---

## Summary
This change adds a new SoYTe-only permission for evidence file backup and deletion operations. The backup functionality is restricted exclusively to SoYTe (Department of Health) users, reflecting the centralized authority model for data archival and storage management.

---

## ADDED Requirements

### Requirement: Role-Based Access Control for Backup Management
The system SHALL enforce strict role-based access control for evidence backup and deletion operations, limiting access exclusively to SoYTe role users.

#### Scenario: SoYTe user can access backup center
- **WHEN** a user with SoYTe role navigates to `/so-y-te/backup`
- **THEN** the system SHALL render the Backup Center page
- **AND** the navigation menu SHALL display a "Sao lưu / Backup" menu item

#### Scenario: DonVi user cannot access backup center
- **WHEN** a user with DonVi role attempts to navigate to `/so-y-te/backup`
- **THEN** the middleware SHALL intercept the request at `/so-y-te/*` route protection
- **AND** the system SHALL return HTTP 403 Forbidden status
- **AND** the user SHALL be redirected to their unit admin dashboard

#### Scenario: NguoiHanhNghe user cannot access backup center
- **WHEN** a user with NguoiHanhNghe role attempts to navigate to `/so-y-te/backup`
- **THEN** the middleware SHALL intercept the request
- **AND** the system SHALL return HTTP 403 Forbidden status
- **AND** the user SHALL be redirected to their practitioner dashboard

#### Scenario: Auditor user cannot access backup center
- **WHEN** a user with Auditor role attempts to navigate to `/so-y-te/backup`
- **THEN** the middleware SHALL intercept the request
- **AND** the system SHALL return HTTP 403 Forbidden status
- **AND** the user SHALL be redirected to their auditor dashboard

#### Scenario: Backup API endpoints enforce SoYTe-only access
- **WHEN** a non-SoYTe user makes an API request to `/api/backup/evidence-files` or `/api/backup/delete-archived`
- **THEN** the system SHALL return HTTP 403 Forbidden status
- **AND** the response SHALL include error message "Access denied. SoYTe role required."
- **AND** no backup or deletion operation SHALL be performed

#### Scenario: Multi-layer backup access enforcement
- **WHEN** backup access control is implemented
- **THEN** checks SHALL be enforced at middleware layer (`/so-y-te/*` route protection)
- **AND** checks SHALL be enforced at page component layer (redirect if not SoYTe)
- **AND** checks SHALL be enforced at API route handler layer (403 if not SoYTe)
- **AND** all layers SHALL use the same role evaluation logic from session

#### Scenario: Navigation menu shows backup for SoYTe only
- **WHEN** a SoYTe user views the navigation menu
- **THEN** the menu SHALL include a "Sao lưu" (Backup) menu item under the SoYTe section
- **AND** the menu item SHALL link to `/so-y-te/backup`

#### Scenario: Navigation menu hides backup for other roles
- **WHEN** a DonVi, NguoiHanhNghe, or Auditor user views the navigation menu
- **THEN** the menu SHALL not display a "Backup" menu item
- **AND** no backup-related links SHALL be visible in the UI

---

## MODIFIED Requirements

### Modified Requirement: Role-Based Access Control for User Management
Updated to reflect the expanded role-based access control model that now includes backup management in addition to user management.

#### Modified Scenario: Middleware enforces role-based route protection
- **WHEN** middleware evaluates route access permissions
- **THEN** the middleware SHALL protect `/so-y-te/*` routes for SoYTe users only
- **AND** the middleware SHALL protect `/don-vi/*` routes for SoYTe and DonVi users
- **AND** the middleware SHALL protect `/nguoi-hanh-nghe/*` routes for all authenticated users
- **AND** the middleware SHALL protect `/auditor/*` routes for Auditor users only
- **AND** the middleware SHALL protect **NEW** `/so-y-te/backup` route for SoYTe users only

---

## REMOVED Requirements

None.

---

## Role Permission Matrix (Updated)

| Feature | SoYTe | DonVi | NguoiHanhNghe | Auditor |
|---------|-------|-------|---------------|---------|
| User Management | ✅ Full | 🔧 Feature Flag | ❌ No | ❌ No |
| Evidence Backup | ✅ Full | ❌ No | ❌ No | ❌ No |
| Evidence Deletion | ✅ Full | ❌ No | ❌ No | ❌ No |
| Backup History | ✅ Full | ❌ No | ❌ No | ❌ No |

---

## Middleware Impact

### Updated Route Protection Rules
```typescript
// middleware.ts - Updated PROTECTED_ROUTES map
const PROTECTED_ROUTES: Record<string, Role[]> = {
  '/so-y-te': ['SoYTe'],
  '/so-y-te/backup': ['SoYTe'], // NEW: Backup center route
  '/don-vi': ['SoYTe', 'DonVi'],
  '/nguoi-hanh-nghe': ['SoYTe', 'DonVi', 'NguoiHanhNghe', 'Auditor'],
  '/auditor': ['Auditor'],
};
```

**Note:** The `/so-y-te/backup` route is automatically protected by the parent `/so-y-te` route, but is explicitly listed here for documentation clarity.

---

## API Impact

### New API Endpoints with Role Enforcement
- `POST /api/backup/evidence-files` - SoYTe only
- `POST /api/backup/delete-archived` - SoYTe only

Both endpoints SHALL validate `session.user.role === 'SoYTe'` before processing requests.

---

## UI Impact

### New Components
- **Page:** `src/app/(authenticated)/so-y-te/backup/page.tsx` (server component with role check)
- **Client Component:** `src/app/(authenticated)/so-y-te/backup/backup-center-client.tsx` (backup UI)

### Modified Components
- **Navigation:** `src/components/layout/` - Add "Backup" menu item for SoYTe users

---

## Security Considerations

### Centralized Authority Model
The restriction of backup and deletion operations to SoYTe role reflects:
1. **Data Governance:** Department of Health has authority over healthcare compliance data
2. **Audit Compliance:** Centralized control ensures proper oversight of archival operations
3. **Risk Mitigation:** Prevents unit admins from accidentally deleting critical evidence
4. **Accountability:** All backup/deletion operations tied to SoYTe admin accounts

### No Feature Flag
Unlike DonVi account management, backup functionality does **NOT** use a feature flag because:
- It is a core operational requirement (storage capacity management)
- SoYTe role already has highest trust level in the system
- Centralized data management is a permanent architectural decision

---

## Testing Additions

### New Role-Based Access Tests
- [ ] SoYTe user can access `/so-y-te/backup` page
- [ ] DonVi user receives 403 when accessing `/so-y-te/backup`
- [ ] NguoiHanhNghe user receives 403 when accessing `/so-y-te/backup`
- [ ] Auditor user receives 403 when accessing `/so-y-te/backup`
- [ ] Non-SoYTe user receives 403 when calling backup API
- [ ] Non-SoYTe user receives 403 when calling delete API
- [ ] SoYTe user sees "Backup" in navigation menu
- [ ] Non-SoYTe users do not see "Backup" in navigation menu

---

## Migration Notes

1. No data migration required
2. Middleware route protection automatically enforced on deployment
3. Navigation updates apply to all users immediately
4. No changes to existing user roles or permissions

---

## Backward Compatibility

✅ **Fully backward compatible.** Adds new role-based access rules without modifying existing user management or role-based access control behavior.
