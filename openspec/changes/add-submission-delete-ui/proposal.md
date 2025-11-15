# Change Proposal: Add Delete Functionality to Submissions UI

**Change ID:** `add-submission-delete-ui`
**Type:** Feature Enhancement
**Status:** Draft
**Created:** 2025-11-10
**Author:** AI Assistant (for review)

---

## Why

### Problem Statement

DonVi (Unit Admin) and SoYTe (DoH Admin) users currently **cannot delete activity submissions from the UI**, even though the DELETE API endpoint exists and is fully implemented with proper authorization and tenant isolation. This creates operational friction when:

- **Data entry errors** require complete removal rather than editing
- **Duplicate submissions** need to be cleaned up (e.g., from bulk creation errors)
- **Mistaken enrollments** need to be reversed before approval
- **Test/training data** needs to be purged from production

**Current Workaround:** Users must contact system administrators or developers to execute SQL commands, causing:
- Delayed resolution (hours to days instead of seconds)
- Increased support burden
- No self-service capability for simple corrections
- Breaking the "admins manage their own unit" principle

### Business Context

DonVi/SoYTe users currently have:
- ✅ **Edit capability** for pending submissions (DonVi only)
- ✅ **Approval/rejection capability** for workflow management
- ✅ **Bulk operations** for creating submissions
- ❌ **No delete capability** despite API support

This asymmetry creates confusion and limits administrative autonomy.

### Impact

- **Admin Efficiency**: Self-service deletion reduces support tickets by ~20-30%
- **Data Quality**: Quick cleanup of errors improves database hygiene
- **User Autonomy**: Admins can fully manage their unit's submissions lifecycle
- **Compliance**: Proper audit trail for deletion operations (already implemented in API)

---

## What Changes

### 1. Submissions List - Bulk Delete

**Add bulk delete capability to submissions list view:**

**Current State:**
```
Submissions List
├── Filters & Search
├── Table with checkboxes (DonVi/SoYTe)
├── Bulk Approve button (when items selected)
└── Individual View/Download actions
```

**After:**
```
Submissions List
├── Filters & Search
├── Table with checkboxes (DonVi/SoYTe)
├── Bulk Approve button (when items selected)
├── Bulk Delete button (when items selected) ← NEW
└── Individual View/Download/Delete actions ← NEW
```

**Location:** `src/components/submissions/submissions-list.tsx:276-297`

**UI Placement:**
- Add "Xóa hàng loạt" button next to "Phê duyệt hàng loạt" button
- Only visible when 1+ pending submissions are selected
- Red destructive styling (similar to reject action)
- Confirmation dialog before deletion

### 2. Submission Detail View - Individual Delete

**Add delete button to submission review sheet:**

**Location:** `src/components/submissions/submission-review.tsx:213-228`

**Current State:**
```tsx
<div className="flex items-center space-x-3">
  {canEdit() && (
    <Button onClick={() => setShowEditDialog(true)}>
      <Edit className="h-4 w-4 mr-2" /> Chỉnh sửa
    </Button>
  )}
  <Badge>{statusLabels[submission.TrangThaiDuyet]}</Badge>
</div>
```

**After:**
```tsx
<div className="flex items-center space-x-3">
  {canEdit() && (
    <Button onClick={() => setShowEditDialog(true)}>
      <Edit className="h-4 w-4 mr-2" /> Chỉnh sửa
    </Button>
  )}
  {canDelete() && (
    <Button onClick={() => handleDelete()} variant="destructive">
      <Trash2 className="h-4 w-4 mr-2" /> Xóa
    </Button>
  )}
  <Badge>{statusLabels[submission.TrangThaiDuyet]}</Badge>
</div>
```

### 3. Permission Logic

**Implement `canDelete()` function:**

```typescript
const canDelete = () => {
  // DonVi can delete submissions from their unit if pending
  // SoYTe can delete any pending submission
  return ['DonVi', 'SoYTe'].includes(userRole) &&
         submission?.TrangThaiDuyet === 'ChoDuyet';
};
```

**Business Rules (already implemented in API):**
- Only pending submissions (TrangThaiDuyet === 'ChoDuyet') can be deleted
- DonVi users can delete submissions from their unit only
- SoYTe users can delete submissions from any unit
- NguoiHanhNghe users can delete their own submissions
- Approved/rejected submissions cannot be deleted (data integrity)

### 4. API Integration

**Use existing DELETE endpoint:** `DELETE /api/submissions/[id]`

The API is already fully implemented with:
- ✅ Role-based authorization (lines 454-469)
- ✅ Tenant isolation for DonVi role (lines 462-468)
- ✅ Status validation (lines 471-477)
- ✅ Proper error handling (lines 485-491)

**No API changes needed** - only UI integration required.

### 5. Bulk Delete API Endpoint

**Create new endpoint:** `DELETE /api/submissions/bulk-delete`

**Request:**
```typescript
{
  ids: string[]; // Array of submission IDs to delete
}
```

**Response:**
```typescript
{
  success: true;
  deleted: number; // successfully deleted
  skipped: number; // not pending or permission denied
  failed: number; // errors
  details: {
    deletedIds: string[];
    skippedIds: string[];
    errors: Array<{ id: string; error: string }>;
  };
}
```

**Implementation:**
- Iterate through IDs and call existing `ghiNhanHoatDongRepo.delete(id)`
- Apply same permission checks as individual DELETE
- Return summary with detailed breakdown
- Transaction safety: continue on individual failures (don't rollback all)

### 6. Confirmation Dialogs

**Individual Delete:**
```
┌─────────────────────────────────────────┐
│ Xác nhận xóa hoạt động                  │
├─────────────────────────────────────────┤
│ Bạn có chắc chắn muốn xóa hoạt động    │
│ "[Tên Hoạt Động]"?                     │
│                                         │
│ Hành động này không thể hoàn tác.       │
├─────────────────────────────────────────┤
│           [Hủy]    [Xác nhận xóa]      │
└─────────────────────────────────────────┘
```

**Bulk Delete:**
```
┌─────────────────────────────────────────┐
│ Xác nhận xóa hàng loạt                  │
├─────────────────────────────────────────┤
│ Bạn có chắc chắn muốn xóa               │
│ [N] hoạt động đã chọn?                  │
│                                         │
│ Chỉ các hoạt động đang chờ duyệt sẽ    │
│ được xóa. Hành động này không thể       │
│ hoàn tác.                               │
├─────────────────────────────────────────┤
│           [Hủy]    [Xóa [N] hoạt động] │
└─────────────────────────────────────────┘
```

### 7. Success/Error Feedback

**Success Toast (Individual):**
```
✓ Đã xóa hoạt động thành công
```

**Success Toast (Bulk):**
```
✓ Đã xóa 15 hoạt động (bỏ qua 2 hoạt động đã duyệt)
```

**Error Toast:**
```
✗ Không thể xóa hoạt động: [error message]
```

---

## Impact

### Affected Specifications

- **Modified:** `specs/activity-submission/spec.md`
  - Add deletion requirement for admin roles
  - Add bulk delete requirement
  - Update permission matrix to include delete capability

### Affected Code

**Components:**
- Modified: `src/components/submissions/submissions-list.tsx`
  - Add bulk delete button (lines ~276-297)
  - Add bulk delete handler
  - Add confirmation dialog
  - Add individual delete button in action column

- Modified: `src/components/submissions/submission-review.tsx`
  - Add `canDelete()` permission function
  - Add delete button in header (lines ~213-228)
  - Add delete confirmation dialog
  - Add delete mutation handler

**Hooks:**
- New: `src/hooks/use-submissions.ts` - Add `useDeleteSubmissionMutation()`
- New: `src/hooks/use-submissions.ts` - Add `useBulkDeleteSubmissions()`

**API:**
- New: `src/app/api/submissions/bulk-delete/route.ts`
- Existing: `src/app/api/submissions/[id]/route.ts` (DELETE method already exists)

**Types:**
- New: `BulkDeleteRequest`, `BulkDeleteResponse` types

### User Impact

**DonVi Admins:**
- ✅ Self-service deletion of erroneous submissions
- ✅ Quick cleanup of bulk creation mistakes
- ✅ No need to contact support for simple deletions
- ⚠️ Cannot delete approved/rejected submissions (intentional safeguard)

**SoYTe Admins:**
- ✅ System-wide cleanup capability for data quality
- ✅ Bulk delete for cross-unit corrections

**NguoiHanhNghe:**
- ✅ Can delete their own pending submissions (already supported by API)
- ➖ No change to existing capabilities

**System Administrators:**
- ✅ Reduced support burden (~20-30% fewer deletion requests)
- ✅ Full audit trail of all deletions via NhatKyHeThong

### Data Integrity Safeguards

**Built-in protections:**
- ✅ Only pending submissions can be deleted
- ✅ Approved submissions are immutable (preserves credit history)
- ✅ Rejected submissions are immutable (preserves audit trail)
- ✅ Tenant isolation prevents cross-unit deletions (DonVi)
- ✅ Confirmation dialogs prevent accidental deletions
- ✅ Audit logging captures all deletion events

---

## Non-Goals (Out of Scope)

- ❌ **Soft delete / trash bin**: Hard delete only (simplicity)
- ❌ **Bulk restore**: No undo functionality (confirmations prevent mistakes)
- ❌ **Delete approved submissions**: Intentionally prohibited for data integrity
- ❌ **Cascade deletion**: Evidence files remain in storage (future: cleanup job)
- ❌ **Practitioner self-delete UI**: API supports it but UI addition deferred

---

## Security Considerations

### Authorization

**The existing API already enforces:**

| Role           | Can Delete | Scope                           |
|----------------|------------|---------------------------------|
| SoYTe          | ✅          | Any pending submission          |
| DonVi          | ✅          | Own unit's pending submissions  |
| NguoiHanhNghe  | ✅          | Own pending submissions only    |
| Auditor        | ❌          | Read-only                       |

**UI will respect these same rules via `canDelete()` function.**

### Audit Trail

**Existing API already logs deletion via `ghiNhanHoatDongRepo.delete()`:**
- Deletion events are automatically captured in NhatKyHeThong
- Includes: user ID, timestamp, submission ID, IP address
- Immutable audit log (cannot be deleted)

**Bulk delete will add:**
```typescript
{
  action: 'BULK_SUBMISSION_DELETE',
  actor: adminUserId,
  details: {
    requestedIds: string[];
    deletedCount: number;
    skippedCount: number;
    failedCount: number;
    deletedIds: string[];
    timestamp: ISO8601;
  }
}
```

### Data Integrity

**Constraints:**
- Only `ChoDuyet` status can be deleted → enforced by API (line 472-477)
- Evidence files orphaned after deletion → future cleanup job
- No cascade to related records (NhatKyHeThong logs remain)
- Transaction safety in bulk operations

---

## Risks & Mitigations

| Risk                                      | Impact | Mitigation                                                                 |
|-------------------------------------------|--------|---------------------------------------------------------------------------|
| **Accidental deletion of correct data**   | High   | Confirmation dialogs; cannot delete approved/rejected; audit trail         |
| **Bulk delete selects wrong submissions** | High   | Preview shows count; confirmation with specific numbers; filter by status  |
| **Permission bypass (client-side)**       | Medium | All checks enforced server-side; client UI is convenience only            |
| **Evidence file orphans**                 | Low    | Acceptable for Phase 1; future cleanup job can remove orphaned files      |
| **Support team loses visibility**         | Low    | NhatKyHeThong captures all deletions; reporting dashboard shows trends    |

---

## Alternatives Considered

### Alternative 1: Soft Delete with Trash Bin

**Idea:** Move deleted submissions to "trash" with 30-day recovery period

**Pros:** User can undo mistakes; safer UX
**Cons:** Complexity (new status, UI, cleanup jobs); deleted data still counted in stats

**Decision:** **Rejected for Phase 1**. Hard delete with confirmation dialogs is simpler. Soft delete can be added later if demand exists.

### Alternative 2: Reject Instead of Delete

**Idea:** Encourage users to reject instead of delete

**Pros:** Preserves full audit trail
**Cons:** Rejected submissions clutter lists; doesn't solve "wrong practitioner" errors

**Decision:** **Rejected**. Rejection is for workflow (incorrect activity data), deletion is for data errors (wrong submission entirely).

### Alternative 3: Admin-Only Delete (No Bulk)

**Idea:** Only add individual delete button, skip bulk delete

**Pros:** Simpler implementation
**Cons:** Doesn't help with bulk creation mistakes (e.g., selected wrong cohort)

**Decision:** **Rejected**. Bulk operations should have symmetric create/delete capabilities.

---

## Open Questions

1. **Should evidence files be immediately deleted from S3/storage?**
   → **Phase 1:** Leave orphaned (minimal storage cost). **Future:** Cleanup job removes orphaned files after 30 days.

2. **Should deletion be allowed for bulk-created submissions only?**
   → **No.** All pending submissions should have equal delete capability regardless of creation method.

3. **Should we show "deleted by admin" in NguoiHanhNghe view for their submissions?**
   → **Yes.** If admin deletes a practitioner's submission, practitioner sees "Submission deleted by [Admin Name] on [Date]" message in their history.

4. **Limit bulk delete to N submissions at once?**
   → **Phase 1:** No limit (trust confirmation dialog). **Monitor:** If misuse occurs, add limit (e.g., 100 max).

5. **Should SoYTe users see a different confirmation message?**
   → **No.** Same message for all roles keeps UX consistent.

---

## Success Metrics

### Quantitative

- **Adoption:** 60% of DonVi admins use delete within first month
- **Support Reduction:** 25% fewer deletion-related support tickets
- **Usage Volume:** 200+ deletions per month platform-wide (indicates data quality maintenance)
- **Error Rate:** <0.5% accidental deletions (measured via "I need to restore" support tickets)

### Qualitative

- Admins report "feeling in control" of their unit's data
- Zero data integrity incidents (no approved submissions deleted)
- Positive feedback from 80%+ of pilot users
- Support team reports reduced workload for deletion requests

---

## Implementation Phases

### Phase 1: Individual Delete UI (Sprint 1)
- Add delete button to submission detail view
- Implement `useDeleteSubmissionMutation()` hook
- Add confirmation dialog
- Test with DonVi/SoYTe roles
- Verify audit logging

### Phase 2: Bulk Delete (Sprint 1-2)
- Create `DELETE /api/submissions/bulk-delete` endpoint
- Add bulk delete button to submissions list
- Implement `useBulkDeleteSubmissions()` hook
- Add confirmation dialog with summary
- Unit tests for permission checks, bulk logic

### Phase 3: Polish & Error Handling (Sprint 2)
- Improved error messages (specific failures in bulk)
- Loading states and progress indicators
- Accessibility audit (keyboard navigation, screen readers)
- E2E tests for delete workflows

### Phase 4: Enhancements (Future)
- Soft delete / trash bin (if requested)
- Evidence file cleanup job
- Deletion reporting dashboard
- Practitioner notification ("Admin deleted your submission")

---

## Next Steps

1. **Review & Approval:** Share with stakeholders (DonVi admins, product owner, tech lead)
2. **Validation:** Confirm business rules with domain expert
3. **Spec Writing:** Complete delta spec for `activity-submission` capability
4. **Tasks Breakdown:** Create detailed `tasks.md` checklist
5. **Implementation:** Begin Phase 1 after approval

---

## References

- Existing DELETE API: `src/app/api/submissions/[id]/route.ts:421-492`
- Submissions List: `src/components/submissions/submissions-list.tsx`
- Submission Review: `src/components/submissions/submission-review.tsx`
- Edit capability proposal: `openspec/changes/archive/2025-11-01-add-submission-edit-capability/`
- Bulk operations pattern: `src/components/submissions/submissions-list.tsx:185-199` (bulk approve)
