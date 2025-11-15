# Change Proposal: Add Unit CRUD Management

**Change ID:** `add-unit-crud-management`
**Type:** Feature Addition
**Status:** Proposed
**Created:** 2025-11-14
**Author:** AI Assistant (for review)

---

## Why

### Problem Statement
The Unit (DonVi) management system currently has **complete backend infrastructure** (repository + schemas) but **zero write operations exposed** via API or UI. SoYTe users can only **view** units in the system, not create, edit, or manage them.

This creates several operational issues:
- **No Self-Service:** Units must be created manually via database scripts
- **No Updates:** Cannot modify unit hierarchy, names, or status through the UI
- **Inconsistent RBAC:** SoYTe has full system access but cannot manage the organizational hierarchy
- **Poor UX:** Incomplete feature compared to Practitioners and Users management

### Current State
**What EXISTS:**
- ✅ `DonViRepository` with full CRUD methods (`create`, `update`, `delete`, `findById`, `getHierarchy`)
- ✅ Zod schemas: `DonViSchema`, `CreateDonViSchema`, `UpdateDonViSchema`
- ✅ `GET /api/units` - Read-only endpoint for listing units
- ✅ Units listing page at `/dashboard/doh/units` (SoYTe only)
- ✅ `UnitComparisonGrid` and `UnitDetailSheet` components

**What's MISSING:**
- ❌ `POST /api/units` - Create new unit
- ❌ `PUT /api/units/[id]` - Update existing unit
- ❌ `DELETE /api/units/[id]` - Soft delete (deactivate) unit
- ❌ Create unit form/dialog
- ❌ Edit unit form/dialog
- ❌ Delete confirmation dialog
- ❌ UI action buttons (Create, Edit, Delete)

### Business Impact
Without this feature:
- SoYTe administrators rely on technical staff for basic organizational changes
- Cannot onboard new healthcare units through the application
- Cannot update unit hierarchy as organizations restructure
- Cannot deactivate closed/merged units
- Inconsistent user experience (full CRUD for users/practitioners, read-only for units)

---

## What Changes

### High-Level Changes

1. **API Routes** (CRUD Operations)
   - `POST /api/units` - Create new healthcare unit
   - `PUT /api/units/[id]` - Update unit details (name, level, parent, status)
   - `DELETE /api/units/[id]` - Soft delete (set `TrangThai = false`)
   - Role-based access: **SoYTe only** (DonVi cannot manage units)
   - Input validation using existing Zod schemas
   - Audit logging for all mutations

2. **UI Components**
   - **Create Unit Dialog:** Modal form with fields:
     - Unit Name (`TenDonVi`)
     - Management Level (`CapQuanLy`: Tinh, Huyen, Xa, BenhVien, etc.)
     - Parent Unit (`MaDonViCha`) - hierarchical dropdown
     - Status (`TrangThai`) - active/inactive toggle
   - **Edit Unit Dialog:** Same form, pre-populated with existing data
   - **Delete Confirmation Dialog:** Warning about cascading effects
   - **Action Buttons:** Add to Units listing page and detail sheet

3. **Page Updates**
   - `/dashboard/doh/units` - Add "Create Unit" button in header
   - `UnitComparisonGrid` - Add Edit/Delete icons per row
   - `UnitDetailSheet` - Add Edit/Delete buttons in sheet header
   - Loading states, error handling, success notifications

4. **Validation & Business Rules**
   - Prevent circular references in unit hierarchy
   - Validate parent unit exists and is active
   - Prevent deletion if unit has:
     - Active child units
     - Active practitioners
     - Active user accounts
   - Unique unit name validation (optional, inform user of duplicates)

5. **Audit Logging**
   - Log all CREATE, UPDATE, DELETE operations to `NhatKyHeThong`
   - Include: admin user, timestamp, old/new values, IP address
   - Track hierarchical changes (parent unit modifications)

---

## Impact

### Affected Specifications
- **New Spec:** `unit-management` (CRUD operations for healthcare units)
- **Modified Specs:**
  - `dashboard` (add unit management UI to SoYTe dashboard)
  - `user-management` (document SoYTe-only access to unit CRUD)

### Affected Code Areas

**Frontend:**
- `src/app/(authenticated)/dashboard/doh/units/page.tsx` - Add Create button
- `src/components/dashboard/doh-units-client.tsx` - Add dialog state management
- `src/components/dashboard/unit-comparison-grid.tsx` - Add Edit/Delete icons
- `src/components/dashboard/unit-detail-sheet.tsx` - Add Edit/Delete buttons
- **New:** `src/components/units/unit-form-dialog.tsx` - Create/Edit form
- **New:** `src/components/units/unit-delete-dialog.tsx` - Delete confirmation

**Backend:**
- **New:** `src/app/api/units/route.ts` - Add POST handler
- **New:** `src/app/api/units/[id]/route.ts` - Add PUT and DELETE handlers
- `src/lib/db/repositories.ts` - Already has full CRUD methods (no changes needed)
- `src/lib/db/schemas.ts` - Already has schemas (no changes needed)

**Database:**
- No migration needed (DonVi table exists with all required columns)
- Use existing `NhatKyHeThong` for audit logging

### User Impact
- **SoYTe Users:** Full self-service unit management capability
- **DonVi Users:** No impact (cannot manage units, only view)
- **Practitioners:** No impact (transparent to end users)
- **Auditors:** Can view unit changes in audit log

### Data Flow Changes
```
Before:
Units → Manual DB Scripts → Database

After:
SoYTe Admin → Create/Edit/Delete UI → API Routes → Repository → Database
                                           ↓
                                      Audit Log
```

### Breaking Changes
**None.** This is a purely additive feature with no changes to existing behavior.

### Reversibility
- Feature can be disabled via middleware check without code changes
- All operations are audited (can review history)
- Soft delete preserves data (can be reactivated)
- No schema changes required

---

## Non-Goals (Out of Scope)

1. **Bulk Import:** No CSV/Excel import of units (can be added later)
2. **Automated Hierarchy:** No AI-based organization structure suggestions
3. **Unit Merging:** No merge/consolidate unit workflows (manual via edit)
4. **Historical Tracking:** No temporal database for unit history (audit log sufficient)
5. **DonVi Self-Management:** DonVi role cannot create/edit units (SoYTe only)
6. **Hard Delete:** No permanent deletion (soft delete only)

---

## Security Considerations

### Access Control
- **Create/Edit/Delete:** SoYTe role ONLY
- **View:** SoYTe (all units), DonVi (own unit only), others (filtered by role)
- **Middleware Protection:** Enforce role check before rendering UI
- **API Protection:** Verify SoYTe role in all mutation endpoints

### Input Validation
- **Zod Schemas:** Use existing `CreateDonViSchema` and `UpdateDonViSchema`
- **SQL Injection Prevention:** Use parameterized queries (repository pattern)
- **XSS Prevention:** Sanitize inputs, use React's built-in escaping
- **Hierarchy Validation:** Prevent circular references and orphaned units

### Audit Trail
- **Log All Mutations:** CREATE, UPDATE, DELETE to `NhatKyHeThong`
- **Include Context:** User ID, timestamp, IP address, old/new values
- **Immutable Logs:** Audit entries cannot be modified or deleted
- **Compliance:** Meet healthcare audit requirements

---

## Performance Considerations

### Database Operations
- **Create:** Single INSERT (~10ms)
- **Update:** Single UPDATE with WHERE clause (~10ms)
- **Delete:** Single UPDATE (soft delete) (~10ms)
- **Hierarchy Query:** Existing `getHierarchy()` uses recursive CTE (indexed, ~50ms)

### UI Responsiveness
- **Optimistic Updates:** Show success immediately, rollback on error
- **Loading States:** Disable buttons during API calls
- **Toast Notifications:** Feedback for success/error states
- **Debounced Search:** Already implemented in existing grid

### Caching
- **TanStack Query:** Cache unit list with 30s stale time
- **Invalidate on Mutation:** Refetch after create/update/delete
- **Prefetch:** Already implemented for unit detail sheets

---

## Success Criteria

### Functional Requirements
- ✅ SoYTe can create new units with name, level, parent, status
- ✅ SoYTe can edit existing units (all fields modifiable)
- ✅ SoYTe can soft delete units (deactivate)
- ✅ System prevents deletion of units with active children/practitioners/users
- ✅ System validates parent unit exists and is active
- ✅ System prevents circular references in hierarchy
- ✅ All mutations are logged to audit trail
- ✅ UI provides clear feedback for success/error states

### User Experience Requirements
- ✅ Create/Edit forms use familiar glassmorphism design
- ✅ Forms validate inputs before submission
- ✅ Error messages are clear and actionable in Vietnamese
- ✅ Confirmation dialogs prevent accidental deletion
- ✅ Loading states indicate when operations are in progress

### Quality Requirements
- ✅ TypeScript strict mode compliance
- ✅ All API endpoints have proper error handling
- ✅ Forms use React Hook Form + Zod validation
- ✅ Consistent with existing Practitioners/Users management UX

---

## Dependencies

### External Packages
- **Existing Dependencies (No New Packages):**
  - `react-hook-form` + `@hookform/resolvers/zod` - Form handling
  - `@radix-ui/react-dialog` - Modal dialogs
  - `zod` - Schema validation
  - `@tanstack/react-query` - State management

### Existing System Components
- `DonViRepository` (`lib/db/repositories.ts`) - Already has CRUD methods
- Zod schemas (`src/lib/db/schemas.ts`) - Already defined
- Authentication system (`src/lib/auth/`) - Role checks
- Audit logging (`NhatKyHeThongRepository`) - Mutation tracking
- Toast notifications (`sonner`) - User feedback

### Environment Variables
- No new environment variables required

---

## Implementation Phases

### Phase 1: API Endpoints (Priority: High)
- Create `POST /api/units` endpoint
- Create `PUT /api/units/[id]` endpoint
- Create `DELETE /api/units/[id]` endpoint
- Add validation and error handling
- Add audit logging

**Estimated Time:** 2-3 hours

### Phase 2: UI Components (Priority: High)
- Create `UnitFormDialog` component (create/edit)
- Create `UnitDeleteDialog` component
- Add form validation with Zod
- Implement loading and error states

**Estimated Time:** 3-4 hours

### Phase 3: Integration (Priority: High)
- Add Create button to units page
- Add Edit/Delete actions to grid and detail sheet
- Connect forms to API endpoints
- Add toast notifications
- Implement cache invalidation

**Estimated Time:** 2-3 hours

### Phase 4: Testing & Polish (Priority: Medium)
- Test hierarchical constraints
- Test validation edge cases
- Test error scenarios
- Polish UI/UX
- Add accessibility attributes

**Estimated Time:** 1-2 hours

**Total Estimated Time:** 8-12 hours

---

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Accidental deletion of critical unit | High | Low | Multi-step confirmation, prevent if has dependents |
| Circular hierarchy references | Medium | Low | Validation logic, prevent saving invalid hierarchy |
| Orphaned units (parent deleted) | Medium | Low | Prevent deletion if has children |
| Concurrent edits by multiple admins | Low | Low | Optimistic locking, last-write-wins acceptable |
| Performance with large hierarchy | Low | Low | Indexed recursive query already optimized |

---

## Open Questions

1. **Should we allow hard delete in addition to soft delete?**
   - **Recommendation:** No, soft delete only (safer, preserves audit trail)

2. **Should we validate unique unit names?**
   - **Recommendation:** Warn if duplicate exists, but allow (some units may share names)

3. **Should we show unit usage statistics before deletion?**
   - **Recommendation:** Yes, show count of practitioners/users/child units

4. **Should we add bulk operations (multi-select delete)?**
   - **Recommendation:** Not in v1, can add later if needed

5. **Should we track unit hierarchy changes over time?**
   - **Recommendation:** Audit log sufficient for v1, temporal tracking if needed later

---

## Approval Checklist

- [ ] Product Owner: Confirms business value and priority
- [ ] Technical Lead: Reviews architectural decisions
- [ ] Security Review: Confirms access control and validation
- [ ] SoYTe Admin: Tests UX flow and confirms usability
- [ ] Database Admin: Confirms no schema changes needed

---

## Next Steps

1. **Review this proposal** with stakeholders
2. **Answer open questions** and finalize scope
3. **Create `tasks.md`** with implementation checklist
4. **Create spec deltas** for `unit-management` capability
5. **Get approval** before starting implementation
6. **Implement in phases** following tasks.md
7. **Test thoroughly** with various scenarios
8. **Deploy to production** with role-based protection
9. **Archive change** after successful deployment

---

## References

- Existing CRUD patterns: `src/app/api/practitioners/`, `src/app/api/users/`
- Repository implementation: `lib/db/repositories.ts:350-397` (DonViRepository)
- Zod schemas: `src/lib/db/schemas.ts:30-39` (DonVi schemas)
- Units UI: `src/app/(authenticated)/dashboard/doh/units/page.tsx`
- Audit: `openspec/changes/add-unit-crud-management/audit-report.md` (findings)
