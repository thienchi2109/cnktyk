# Submissions: Dynamic badge + Bulk Approve implementation

Date: 2025-10-22

Summary
- Implemented end-to-end bulk approval for activity submissions.
- Replaced mock badge value in the header Navigation with a live pending-count from DB for unit admins (DonVi).
- Improved refresh flow after create/review and synced header badge after bulk operations.

Backend changes
- src/lib/db/repositories.ts
  - Added approveActivities(ids, comments?, unitId?) to approve multiple pending submissions in a single SQL UPDATE with optional unit restriction.
  - Existing getActivityStats(unitId?) leveraged for badge count.
- src/app/api/submissions/bulk/route.ts (NEW)
  - POST { action: "approve", ids: string[], comments? } → { processedCount, updatedIds, skippedIds }.
  - RBAC: allowed for DonVi (restricted to own unit) and SoYTe.
- src/app/api/activities/stats/route.ts (NEW)
  - GET → { total, pending, approved, rejected } with RBAC-aware unit scoping.

Frontend changes
- src/components/layout/responsive-navigation.tsx
  - Added submissionPendingCount prop; badge for Hoạt động shows live count for DonVi.
- src/app/(authenticated)/layout.tsx
  - Fetches unread notifications and pending submissions; passes submissionPendingCount to header.
- src/hooks/use-submissions.ts
  - Added refreshKey to query key to support explicit refetches.
  - Added useBulkApproveSubmissions mutation (POST /api/submissions/bulk) with cache invalidation.
- src/components/submissions/submissions-list.tsx
  - Selection UX: checkboxes for pending rows, select-all for page, bulk approve button.
  - Feedback: success/error Alert with counts; button disabled and shows loading while pending.
  - Removed empty-state “Ghi nhận hoạt động đầu tiên” button (per request).
  - Calls router.refresh() after bulk approve to update list + header badge immediately.

Developer notes
- Typecheck: passed (tsc --noEmit).
- ESLint: warnings only (no new errors).

How to test
1) As DonVi user with pending submissions:
   - See header “Hoạt động” badge show DB pending count.
   - Select multiple pending rows → click “Phê duyệt hàng loạt” → success alert and header badge decreases without full reload.
2) As SoYTe user:
   - Bulk approval permitted across units; badge not shown.
3) Review single submission:
   - After approve/reject, list refetches due to invalidation; counts reflect changes.

Follow-ups (optional)
- Add bulk reject/request-info flow mirroring approve.
- Unit tests for repo method and API RBAC.
- Consider lifting header stats to a client provider for push updates without router.refresh().
