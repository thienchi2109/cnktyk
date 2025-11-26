Bulk Revoke Approvals Feature - Implementation Walkthrough
Overview
Successfully implemented a bulk revoke approvals feature that allows administrators (DonVi and SoYTe roles) to cancel approved submissions and return them to pending status. This feature mirrors the existing bulk approve functionality and includes mandatory revocation reason tracking.

Implementation Summary
1. Backend - Database Layer
Repository Method (
repositories.ts:1000-1051
)
Added 
revokeActivities()
 method to 
GhiNhanHoatDongRepository
:

Key Features:

Reverts TrangThaiDuyet from 'DaDuyet' → 'ChoDuyet'
Sets NgayDuyet to NULL
Appends revocation reason to existing GhiChuDuyet with timestamp
Enforces tenant isolation for DonVi users via unitId parameter
Only processes approved (DaDuyet) submissions
Returns array of successfully revoked submission IDs
SQL Logic:

UPDATE "GhiNhanHoatDong" g
SET "TrangThaiDuyet" = 'ChoDuyet',
    "NgayDuyet" = NULL,
    "GhiChuDuyet" = CASE 
      WHEN "GhiChuDuyet" IS NULL OR "GhiChuDuyet" = '' THEN $2
      ELSE "GhiChuDuyet" || E'\\n' || $2
    END
WHERE g."MaGhiNhan" = ANY($1::uuid[])
  AND g."TrangThaiDuyet" = 'DaDuyet'
Revocation Note Format:

[HỦY DUYỆT: 2025-11-26T14:46:51.000Z] User-provided reason
2. Backend - API Route
Updated Route (
route.ts
)
Extended /api/submissions/bulk POST endpoint to handle both 
approve
 and 
revoke
 actions:

Changes:

Updated Zod schema to accept action: z.enum(['approve', 'revoke'])
Added reason field (optional in schema, but validated as required for revoke)
Branched logic based on action type
Returns consistent response format for both actions
Security:

Same permission checks as bulk approve (DonVi/SoYTe only)
Tenant isolation enforced via unitId
Validates revocation reason is not empty
3. Audit Trail
Audit Action (
audit-actions.ts:61-64
)
Added new audit action constant:

BULK_SUBMISSION_REVOKE: 'BULK_SUBMISSION_REVOKE'
This enables tracking of bulk revoke operations in the 
NhatKyHeThong
 audit log.

4. Frontend - Hooks
New Hook (
use-submissions.ts:107-123
)
Created 
useBulkRevokeApprovals()
 hook:

Features:

Calls /api/submissions/bulk with action: 'revoke'
Requires ids array and reason string
Invalidates submissions query cache on success
Returns processed count, updated IDs, and skipped IDs
5. Frontend - UI Components
Submissions List (
submissions-list.tsx
)
State Management:

Added bulkRevoke mutation hook
Added showRevokeDialog and revokeReason state variables
Handlers:

handleBulkRevoke()
 - Opens confirmation dialog
handleConfirmRevoke()
 - Validates reason and executes revoke operation
UI Components:

Bulk Revoke Button (lines 563-587)

Only visible when statusFilter === 'DaDuyet' AND items are selected
Red destructive variant to indicate caution
Shows loading state during operation
Displays count of selected items
Revoke Confirmation Dialog (lines 1175-1243)

Modal dialog with mandatory reason input
Auto-focus on reason field
Validation: Submit button disabled if reason is empty
Warning alert about action consequences
Shows count of affected submissions
Cancel and Confirm buttons with appropriate styling
User Flow
Filter by Approved Status

User selects "Đã duyệt" from status filter dropdown
Only approved submissions are displayed
Select Submissions

User checks boxes next to submissions to revoke
Bulk revoke button appears (red, destructive style)
Initiate Revoke

User clicks "Hủy duyệt hàng loạt (X)" button
Confirmation dialog opens
Provide Reason

User enters mandatory revocation reason
Reason is validated (cannot be empty)
Submit button enabled only when reason is provided
Confirm Action

User clicks "Xác nhận hủy duyệt"
API processes revoke request
Success/error feedback displayed
Page refreshes to show updated statuses
Security & Data Integrity
✅ Tenant Isolation: DonVi users can only revoke submissions from their own unit
✅ Role-Based Access: Only DonVi and SoYTe roles can perform bulk revoke
✅ Status Validation: Only approved (DaDuyet) submissions can be revoked
✅ Audit Trail: Revocation reason appended to existing comments with timestamp
✅ Mandatory Reason: Cannot proceed without providing revocation justification

Bug Fix: Selection Logic
Issue
Initial implementation had a critical bug where approved submissions could not be selected for bulk revoke. The selection logic was hardcoded to only allow selecting pending (ChoDuyet) submissions, making the bulk revoke feature unreachable.

Root Cause
Three places in the code hardcoded the pending status filter:

isSelectable check in row rendering (line 874)
toggleSelectAll
 function (line 358)
pendingIdsOnPage calculation (line 317)
Solution
Updated all three locations to dynamically determine selectable statuses based on current filter:

When statusFilter === 'DaDuyet': Allow selecting approved submissions (for revoke)
Otherwise: Allow selecting pending submissions (for approve/delete)
Code Changes:

// Dynamic selectable statuses based on filter
const selectableStatuses = statusFilter === 'DaDuyet' ? ['DaDuyet'] : ['ChoDuyet'];
// Used in three places:
// 1. toggleSelectAll function
// 2. isSelectable check
// 3. selectableIdsOnPage calculation
Testing Recommendations
Manual Testing Checklist
 DonVi Role: Verify can only revoke submissions from own unit
 SoYTe Role: Verify can revoke submissions from any unit
 Status Filter: Confirm button only appears when filtering by "Đã duyệt"
 Reason Validation: Confirm cannot submit without entering reason
 Comment Appending: Verify revocation reason is appended to existing comments
 Status Change: Confirm submissions return to "Chờ duyệt" status
 NgayDuyet Reset: Verify approval date is cleared
 Feedback Messages: Check success/error messages display correctly
 Page Refresh: Confirm data refreshes after operation
Edge Cases
 Revoking submissions that were already revoked by another user
 Network errors during revoke operation
 Very long revocation reasons (test character limits)
 Multiple consecutive revoke operations
Files Modified
File	Changes
audit-actions.ts
Added BULK_SUBMISSION_REVOKE constant
repositories.ts
Added 
revokeActivities()
 method
route.ts
Extended to handle 'revoke' action
use-submissions.ts
Added 
useBulkRevokeApprovals()
 hook
submissions-list.tsx
Added UI button, dialog, and handlers
Next Steps
Test the feature with both DonVi and SoYTe roles
Verify audit logging in 
NhatKyHeThong
 table
Check comment appending in database
Consider adding bulk revoke to reports/analytics if needed
Document the feature in user manual/help docs
Summary
The bulk revoke approvals feature is now fully implemented and ready for testing. It provides administrators with a safe, auditable way to cancel approved submissions with mandatory justification, maintaining data integrity and security throughout the process.

