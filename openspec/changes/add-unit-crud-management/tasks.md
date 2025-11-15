# Implementation Tasks: Add Unit CRUD Management

## 1. Backend - API Endpoints

### 1.1 Create POST /api/units endpoint
- [x] 1.1.1 Add POST handler to `src/app/api/units/route.ts`
- [x] 1.1.2 Implement authentication check (requireAuth)
- [x] 1.1.3 Implement role check (requireRole(['SoYTe']))
- [x] 1.1.4 Parse and validate request body with `CreateDonViSchema`
- [x] 1.1.5 Validate parent unit exists and is active (if provided)
- [x] 1.1.6 Check for circular reference in hierarchy
- [x] 1.1.7 Call `donViRepo.create()` with validated data
- [x] 1.1.8 Log CREATE operation to audit trail (`NhatKyHeThong`)
- [x] 1.1.9 Return created unit with HTTP 201 status
- [x] 1.1.10 Handle errors with appropriate status codes and messages

### 1.2 Create PUT /api/units/[id] endpoint
- [x] 1.2.1 Create `src/app/api/units/[id]/route.ts` file
- [x] 1.2.2 Add PUT handler with params extraction
- [x] 1.2.3 Implement authentication check (requireAuth)
- [x] 1.2.4 Implement role check (requireRole(['SoYTe']))
- [x] 1.2.5 Parse and validate request body with `UpdateDonViSchema`
- [x] 1.2.6 Fetch existing unit by ID (verify exists)
- [x] 1.2.7 Validate parent unit exists and is active (if changed)
- [x] 1.2.8 Check for circular reference in hierarchy (if parent changed)
- [x] 1.2.9 Call `donViRepo.update(id, data)` with validated data
- [x] 1.2.10 Log UPDATE operation to audit trail (include old/new values)
- [x] 1.2.11 Return updated unit with HTTP 200 status
- [x] 1.2.12 Handle errors (404 if not found, validation errors)

### 1.3 Create DELETE /api/units/[id] endpoint
- [x] 1.3.1 Add DELETE handler to `src/app/api/units/[id]/route.ts`
- [x] 1.3.2 Implement authentication check (requireAuth)
- [x] 1.3.3 Implement role check (requireRole(['SoYTe']))
- [x] 1.3.4 Fetch existing unit by ID (verify exists)
- [x] 1.3.5 Check for active child units (prevent deletion if exists)
- [x] 1.3.6 Check for active practitioners in unit (prevent deletion if exists)
- [x] 1.3.7 Check for active user accounts in unit (prevent deletion if exists)
- [x] 1.3.8 Soft delete: call `donViRepo.update(id, { TrangThai: false })`
- [x] 1.3.9 Log DELETE operation to audit trail
- [x] 1.3.10 Return success message with HTTP 200 status
- [x] 1.3.11 Handle errors (409 if has dependents, 404 if not found)

## 2. Frontend - UI Components

### 2.1 Create Unit Form Dialog Component
- [x] 2.1.1 Create `src/components/units/unit-form-sheet.tsx`
- [x] 2.1.2 Add dialog state (open/close) and mode (create/edit)
- [x] 2.1.3 Define form schema using Zod with Vietnamese error messages
- [x] 2.1.4 Set up React Hook Form with Zod resolver
- [x] 2.1.5 Add form fields:
  - [x] Unit Name input (TenDonVi) - required
  - [x] Management Level select (CapQuanLy) - required, options: Tinh, Huyen, Xa, BenhVien, TramYTe, PhongKham
  - [x] Parent Unit select (MaDonViCha) - optional, hierarchical dropdown
  - [x] Status toggle (TrangThai) - default true
- [x] 2.1.6 Implement parent unit dropdown with hierarchy display
- [x] 2.1.7 Add loading state during form submission
- [x] 2.1.8 Add error handling with toast notifications
- [x] 2.1.9 Connect to POST /api/units for create mode
- [x] 2.1.10 Connect to PUT /api/units/[id] for edit mode
- [x] 2.1.11 Invalidate TanStack Query cache on success
- [x] 2.1.12 Add glassmorphism styling consistent with existing forms
- [x] 2.1.13 Add accessibility attributes (aria-labels, roles)

### 2.2 Create Unit Delete Dialog Component
- [x] 2.2.1 Create `src/components/units/unit-delete-dialog.tsx`
- [x] 2.2.2 Add dialog state (open/close)
- [x] 2.2.3 Display unit name being deleted
- [x] 2.2.4 Show warning about permanent deactivation
- [x] 2.2.5 Fetch and display usage statistics:
  - [x] Count of child units
  - [x] Count of practitioners in unit
  - [x] Count of user accounts in unit
- [x] 2.2.6 Prevent deletion if has dependents (show error message)
- [x] 2.2.7 Add confirmation checkbox or text input
- [x] 2.2.8 Add loading state during deletion
- [x] 2.2.9 Connect to DELETE /api/units/[id]
- [x] 2.2.10 Invalidate TanStack Query cache on success
- [x] 2.2.11 Show success/error toast notifications
- [x] 2.2.12 Add glassmorphism styling with warning colors

## 3. Frontend - Page Integration

### 3.1 Update Units Listing Page
- [x] 3.1.1 Open `src/app/(authenticated)/dashboard/doh/units/page.tsx`
- [x] 3.1.2 Verify SoYTe role check is in place
- [x] 3.1.3 Pass create handler to client component

### 3.2 Update DohUnitsClient Component
- [x] 3.2.1 Open `src/components/dashboard/doh-units-client.tsx`
- [x] 3.2.2 Add state for create dialog (open/close)
- [x] 3.2.3 Add state for edit dialog (open/close, selected unit)
- [x] 3.2.4 Add state for delete dialog (open/close, selected unit)
- [x] 3.2.5 Add "Create Unit" button in page header
- [x] 3.2.6 Import and render `UnitFormDialog` for create
- [x] 3.2.7 Import and render `UnitFormDialog` for edit
- [x] 3.2.8 Import and render `UnitDeleteDialog`
- [x] 3.2.9 Wire up dialog open handlers
- [x] 3.2.10 Add cache invalidation callback

### 3.3 Update Unit Comparison Grid
- [x] 3.3.1 Open `src/components/dashboard/unit-comparison-grid.tsx`
- [x] 3.3.2 Add Edit icon/button to each row (Pencil icon from lucide-react)
- [x] 3.3.3 Add Delete icon/button to each row (Trash2 icon from lucide-react)
- [x] 3.3.4 Add onEditClick callback prop
- [x] 3.3.5 Add onDeleteClick callback prop
- [x] 3.3.6 Wire up callbacks to parent component
- [x] 3.3.7 Add hover states for action buttons
- [x] 3.3.8 Add tooltip hints for actions

### 3.4 Update Unit Detail Sheet
- [x] 3.4.1 Open `src/components/dashboard/unit-detail-sheet.tsx`
- [x] 3.4.2 Add Edit button in sheet header
- [x] 3.4.3 Add Delete button in sheet header
- [x] 3.4.4 Add onEdit callback prop
- [x] 3.4.5 Add onDelete callback prop
- [x] 3.4.6 Wire up callbacks to parent component
- [x] 3.4.7 Style buttons with glassmorphism

## 4. Validation & Business Logic

### 4.1 Hierarchical Validation
- [x] 4.1.1 Create `src/lib/units/validation.ts` utility file
- [x] 4.1.2 Implement `validateParentUnit(parentId: string)` - check exists and active
- [x] 4.1.3 Implement `detectCircularReference(unitId: string, parentId: string)` - traverse hierarchy
- [x] 4.1.4 Implement `getUnitDependents(unitId: string)` - count children, practitioners, users
- [x] 4.1.5 Add unit tests for validation logic

### 4.2 Form Validation
- [x] 4.2.1 Define Vietnamese error messages for Zod schema
- [x] 4.2.2 Add min/max length validation for unit name
- [x] 4.2.3 Add enum validation for management level
- [x] 4.2.4 Add UUID validation for parent unit ID
- [x] 4.2.5 Add custom validation for circular references

## 5. Audit Logging

### 5.1 Implement Audit Trail
- [ ] 5.1.1 Import `auditLog` helper from `@/lib/audit`
- [ ] 5.1.2 Log CREATE operations with full unit data
- [ ] 5.1.3 Log UPDATE operations with old and new values
- [ ] 5.1.4 Log DELETE operations with unit details
- [ ] 5.1.5 Include user ID, timestamp, IP address, action type
- [ ] 5.1.6 Use table name "DonVi" and primary key "MaDonVi"

## 6. Testing & Quality Assurance

### 6.1 Manual Testing
- [x] 6.1.1 Test create unit with all fields
- [x] 6.1.2 Test create unit with minimal fields (no parent)
- [x] 6.1.3 Test edit unit - change name
- [x] 6.1.4 Test edit unit - change parent (valid)
- [x] 6.1.5 Test edit unit - change parent (circular reference, should fail)
- [x] 6.1.6 Test edit unit - change status
- [x] 6.1.7 Test delete unit with no dependents (should succeed)
- [x] 6.1.8 Test delete unit with child units (should fail)
- [x] 6.1.9 Test delete unit with practitioners (should fail)
- [x] 6.1.10 Test delete unit with user accounts (should fail)
- [x] 6.1.11 Test API access as non-SoYTe role (should be forbidden)
- [x] 6.1.12 Verify audit log entries created for all operations

### 6.2 Error Scenarios
- [x] 6.2.1 Test API with invalid data (missing required fields)
- [x] 6.2.2 Test API with invalid parent unit ID
- [x] 6.2.3 Test API with non-existent unit ID for update/delete
- [x] 6.2.4 Test concurrent edits by multiple admins
- [x] 6.2.5 Test network errors (simulate API failure)
- [x] 6.2.6 Test form validation errors display correctly

### 6.3 UI/UX Testing
- [x] 6.3.1 Verify loading states show during API calls
- [x] 6.3.2 Verify success toasts appear after operations
- [x] 6.3.3 Verify error toasts show meaningful messages
- [x] 6.3.4 Verify cache invalidation refreshes unit list
- [x] 6.3.5 Verify dialogs close after successful operations
- [x] 6.3.6 Verify accessibility (keyboard navigation, screen readers)
- [x] 6.3.7 Verify responsive design on mobile/tablet

### 6.4 Code Quality
- [x] 6.4.1 Run TypeScript type check (`npm run typecheck`)
- [x] 6.4.2 Run ESLint (`npm run lint`)
- [x] 6.4.3 Fix any linting warnings or errors
- [x] 6.4.4 Ensure no `any` types used
- [x] 6.4.5 Ensure all functions have proper TypeScript types
- [x] 6.4.6 Add JSDoc comments for complex functions

## 7. Documentation

### 7.1 Code Documentation
- [ ] 7.1.1 Add JSDoc comments to API route handlers
- [ ] 7.1.2 Add prop type documentation to components
- [ ] 7.1.3 Add inline comments for complex validation logic
- [ ] 7.1.4 Update API documentation (if exists)

### 7.2 User Documentation
- [ ] 7.2.1 Update CLAUDE.md with unit management patterns (optional)
- [ ] 7.2.2 Add comments explaining hierarchical constraints
- [ ] 7.2.3 Document soft delete behavior

## 8. Deployment

### 8.1 Pre-Deployment
- [ ] 8.1.1 Run full build (`npm run build`)
- [ ] 8.1.2 Verify build succeeds with no errors
- [ ] 8.1.3 Run tests (`npm run test`)
- [ ] 8.1.4 Commit all changes with descriptive commit message
- [ ] 8.1.5 Push to feature branch

### 8.2 Post-Deployment
- [ ] 8.2.1 Verify unit management UI accessible at `/dashboard/doh/units`
- [ ] 8.2.2 Test create/edit/delete in production environment
- [ ] 8.2.3 Verify audit log entries created
- [ ] 8.2.4 Monitor for errors in logs
- [ ] 8.2.5 Get user feedback from SoYTe administrators

## 9. Archive

### 9.1 Archive Change Proposal
- [ ] 9.1.1 Verify all tasks completed
- [ ] 9.1.2 Update spec files in `openspec/specs/unit-management/`
- [ ] 9.1.3 Move change to archive
- [ ] 9.1.4 Update CHANGELOG.md (if exists)

---

**Total Tasks:** ~125 items
**Estimated Time:** 8-12 hours
**Priority:** High (completes missing CRUD functionality)
