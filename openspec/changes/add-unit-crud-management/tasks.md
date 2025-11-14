# Implementation Tasks: Add Unit CRUD Management

## 1. Backend - API Endpoints

### 1.1 Create POST /api/units endpoint
- [ ] 1.1.1 Add POST handler to `src/app/api/units/route.ts`
- [ ] 1.1.2 Implement authentication check (requireAuth)
- [ ] 1.1.3 Implement role check (requireRole(['SoYTe']))
- [ ] 1.1.4 Parse and validate request body with `CreateDonViSchema`
- [ ] 1.1.5 Validate parent unit exists and is active (if provided)
- [ ] 1.1.6 Check for circular reference in hierarchy
- [ ] 1.1.7 Call `donViRepo.create()` with validated data
- [ ] 1.1.8 Log CREATE operation to audit trail (`NhatKyHeThong`)
- [ ] 1.1.9 Return created unit with HTTP 201 status
- [ ] 1.1.10 Handle errors with appropriate status codes and messages

### 1.2 Create PUT /api/units/[id] endpoint
- [ ] 1.2.1 Create `src/app/api/units/[id]/route.ts` file
- [ ] 1.2.2 Add PUT handler with params extraction
- [ ] 1.2.3 Implement authentication check (requireAuth)
- [ ] 1.2.4 Implement role check (requireRole(['SoYTe']))
- [ ] 1.2.5 Parse and validate request body with `UpdateDonViSchema`
- [ ] 1.2.6 Fetch existing unit by ID (verify exists)
- [ ] 1.2.7 Validate parent unit exists and is active (if changed)
- [ ] 1.2.8 Check for circular reference in hierarchy (if parent changed)
- [ ] 1.2.9 Call `donViRepo.update(id, data)` with validated data
- [ ] 1.2.10 Log UPDATE operation to audit trail (include old/new values)
- [ ] 1.2.11 Return updated unit with HTTP 200 status
- [ ] 1.2.12 Handle errors (404 if not found, validation errors)

### 1.3 Create DELETE /api/units/[id] endpoint
- [ ] 1.3.1 Add DELETE handler to `src/app/api/units/[id]/route.ts`
- [ ] 1.3.2 Implement authentication check (requireAuth)
- [ ] 1.3.3 Implement role check (requireRole(['SoYTe']))
- [ ] 1.3.4 Fetch existing unit by ID (verify exists)
- [ ] 1.3.5 Check for active child units (prevent deletion if exists)
- [ ] 1.3.6 Check for active practitioners in unit (prevent deletion if exists)
- [ ] 1.3.7 Check for active user accounts in unit (prevent deletion if exists)
- [ ] 1.3.8 Soft delete: call `donViRepo.update(id, { TrangThai: false })`
- [ ] 1.3.9 Log DELETE operation to audit trail
- [ ] 1.3.10 Return success message with HTTP 200 status
- [ ] 1.3.11 Handle errors (409 if has dependents, 404 if not found)

## 2. Frontend - UI Components

### 2.1 Create Unit Form Dialog Component
- [ ] 2.1.1 Create `src/components/units/unit-form-dialog.tsx`
- [ ] 2.1.2 Add dialog state (open/close) and mode (create/edit)
- [ ] 2.1.3 Define form schema using Zod with Vietnamese error messages
- [ ] 2.1.4 Set up React Hook Form with Zod resolver
- [ ] 2.1.5 Add form fields:
  - [ ] Unit Name input (TenDonVi) - required
  - [ ] Management Level select (CapQuanLy) - required, options: Tinh, Huyen, Xa, BenhVien, TramYTe, PhongKham
  - [ ] Parent Unit select (MaDonViCha) - optional, hierarchical dropdown
  - [ ] Status toggle (TrangThai) - default true
- [ ] 2.1.6 Implement parent unit dropdown with hierarchy display
- [ ] 2.1.7 Add loading state during form submission
- [ ] 2.1.8 Add error handling with toast notifications
- [ ] 2.1.9 Connect to POST /api/units for create mode
- [ ] 2.1.10 Connect to PUT /api/units/[id] for edit mode
- [ ] 2.1.11 Invalidate TanStack Query cache on success
- [ ] 2.1.12 Add glassmorphism styling consistent with existing forms
- [ ] 2.1.13 Add accessibility attributes (aria-labels, roles)

### 2.2 Create Unit Delete Dialog Component
- [ ] 2.2.1 Create `src/components/units/unit-delete-dialog.tsx`
- [ ] 2.2.2 Add dialog state (open/close)
- [ ] 2.2.3 Display unit name being deleted
- [ ] 2.2.4 Show warning about permanent deactivation
- [ ] 2.2.5 Fetch and display usage statistics:
  - [ ] Count of child units
  - [ ] Count of practitioners in unit
  - [ ] Count of user accounts in unit
- [ ] 2.2.6 Prevent deletion if has dependents (show error message)
- [ ] 2.2.7 Add confirmation checkbox or text input
- [ ] 2.2.8 Add loading state during deletion
- [ ] 2.2.9 Connect to DELETE /api/units/[id]
- [ ] 2.2.10 Invalidate TanStack Query cache on success
- [ ] 2.2.11 Show success/error toast notifications
- [ ] 2.2.12 Add glassmorphism styling with warning colors

## 3. Frontend - Page Integration

### 3.1 Update Units Listing Page
- [ ] 3.1.1 Open `src/app/(authenticated)/dashboard/doh/units/page.tsx`
- [ ] 3.1.2 Verify SoYTe role check is in place
- [ ] 3.1.3 Pass create handler to client component

### 3.2 Update DohUnitsClient Component
- [ ] 3.2.1 Open `src/components/dashboard/doh-units-client.tsx`
- [ ] 3.2.2 Add state for create dialog (open/close)
- [ ] 3.2.3 Add state for edit dialog (open/close, selected unit)
- [ ] 3.2.4 Add state for delete dialog (open/close, selected unit)
- [ ] 3.2.5 Add "Create Unit" button in page header
- [ ] 3.2.6 Import and render `UnitFormDialog` for create
- [ ] 3.2.7 Import and render `UnitFormDialog` for edit
- [ ] 3.2.8 Import and render `UnitDeleteDialog`
- [ ] 3.2.9 Wire up dialog open handlers
- [ ] 3.2.10 Add cache invalidation callback

### 3.3 Update Unit Comparison Grid
- [ ] 3.3.1 Open `src/components/dashboard/unit-comparison-grid.tsx`
- [ ] 3.3.2 Add Edit icon/button to each row (Pencil icon from lucide-react)
- [ ] 3.3.3 Add Delete icon/button to each row (Trash2 icon from lucide-react)
- [ ] 3.3.4 Add onEditClick callback prop
- [ ] 3.3.5 Add onDeleteClick callback prop
- [ ] 3.3.6 Wire up callbacks to parent component
- [ ] 3.3.7 Add hover states for action buttons
- [ ] 3.3.8 Add tooltip hints for actions

### 3.4 Update Unit Detail Sheet
- [ ] 3.4.1 Open `src/components/dashboard/unit-detail-sheet.tsx`
- [ ] 3.4.2 Add Edit button in sheet header
- [ ] 3.4.3 Add Delete button in sheet header
- [ ] 3.4.4 Add onEdit callback prop
- [ ] 3.4.5 Add onDelete callback prop
- [ ] 3.4.6 Wire up callbacks to parent component
- [ ] 3.4.7 Style buttons with glassmorphism

## 4. Validation & Business Logic

### 4.1 Hierarchical Validation
- [ ] 4.1.1 Create `src/lib/units/validation.ts` utility file
- [ ] 4.1.2 Implement `validateParentUnit(parentId: string)` - check exists and active
- [ ] 4.1.3 Implement `detectCircularReference(unitId: string, parentId: string)` - traverse hierarchy
- [ ] 4.1.4 Implement `getUnitDependents(unitId: string)` - count children, practitioners, users
- [ ] 4.1.5 Add unit tests for validation logic

### 4.2 Form Validation
- [ ] 4.2.1 Define Vietnamese error messages for Zod schema
- [ ] 4.2.2 Add min/max length validation for unit name
- [ ] 4.2.3 Add enum validation for management level
- [ ] 4.2.4 Add UUID validation for parent unit ID
- [ ] 4.2.5 Add custom validation for circular references

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
- [ ] 6.1.1 Test create unit with all fields
- [ ] 6.1.2 Test create unit with minimal fields (no parent)
- [ ] 6.1.3 Test edit unit - change name
- [ ] 6.1.4 Test edit unit - change parent (valid)
- [ ] 6.1.5 Test edit unit - change parent (circular reference, should fail)
- [ ] 6.1.6 Test edit unit - change status
- [ ] 6.1.7 Test delete unit with no dependents (should succeed)
- [ ] 6.1.8 Test delete unit with child units (should fail)
- [ ] 6.1.9 Test delete unit with practitioners (should fail)
- [ ] 6.1.10 Test delete unit with user accounts (should fail)
- [ ] 6.1.11 Test API access as non-SoYTe role (should be forbidden)
- [ ] 6.1.12 Verify audit log entries created for all operations

### 6.2 Error Scenarios
- [ ] 6.2.1 Test API with invalid data (missing required fields)
- [ ] 6.2.2 Test API with invalid parent unit ID
- [ ] 6.2.3 Test API with non-existent unit ID for update/delete
- [ ] 6.2.4 Test concurrent edits by multiple admins
- [ ] 6.2.5 Test network errors (simulate API failure)
- [ ] 6.2.6 Test form validation errors display correctly

### 6.3 UI/UX Testing
- [ ] 6.3.1 Verify loading states show during API calls
- [ ] 6.3.2 Verify success toasts appear after operations
- [ ] 6.3.3 Verify error toasts show meaningful messages
- [ ] 6.3.4 Verify cache invalidation refreshes unit list
- [ ] 6.3.5 Verify dialogs close after successful operations
- [ ] 6.3.6 Verify accessibility (keyboard navigation, screen readers)
- [ ] 6.3.7 Verify responsive design on mobile/tablet

### 6.4 Code Quality
- [ ] 6.4.1 Run TypeScript type check (`npm run typecheck`)
- [ ] 6.4.2 Run ESLint (`npm run lint`)
- [ ] 6.4.3 Fix any linting warnings or errors
- [ ] 6.4.4 Ensure no `any` types used
- [ ] 6.4.5 Ensure all functions have proper TypeScript types
- [ ] 6.4.6 Add JSDoc comments for complex functions

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
