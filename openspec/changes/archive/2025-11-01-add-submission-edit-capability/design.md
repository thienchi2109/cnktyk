# Design Document - Submission Edit Capability

## Context

The CNKTYKLT compliance platform currently supports creating and approving activity submissions, but lacks the ability to edit submissions after creation. This creates operational friction when data entry errors occur, forcing unit admins to reject and recreate submissions. This design document outlines the technical approach for adding edit capability while maintaining security, audit compliance, and data integrity.

## Goals / Non-Goals

### Goals
- Enable DonVi users to edit submission data while status is ChoDuyet (pending)
- Maintain full audit trail of all edits (before/after state)
- Preserve tenant isolation and role-based access control
- Reuse existing validation logic and UI patterns
- Keep edit scope limited to data fields (not approval workflow)

### Non-Goals
- Editing approved/rejected submissions (immutable after decision)
- SoYTe editing submissions (governance role remains read-only)
- NguoiHanhNghe editing submissions (managed by unit admins)
- Editing practitioner linkage (MaNhanVien field locked after creation)
- Bulk edit operations (single submission edit only in v1)

## Decisions

### Decision 1: PATCH Endpoint for Updates
**Choice**: Use PATCH `/api/submissions/[id]` for editing data fields, separate from PUT (approval workflow).

**Rationale**: 
- PUT already handles approve/reject actions with TrangThaiDuyet changes
- PATCH semantically represents partial updates to resource
- Keeps approval workflow isolated from data editing
- Follows REST conventions for partial updates

**Alternatives Considered**:
- Overload PUT with action parameter - rejected due to mixing concerns
- Use POST to new endpoint - rejected as not RESTful for updates

### Decision 2: Status Restriction (ChoDuyet Only)
**Choice**: Only allow editing when `TrangThaiDuyet = 'ChoDuyet'`.

**Rationale**:
- Approved/rejected submissions represent finalized decisions
- Editing after approval breaks compliance audit integrity
- Practitioners rely on approval status as source of truth
- Prevents retroactive data manipulation

**Alternatives Considered**:
- Allow editing with re-approval workflow - adds complexity without clear benefit
- Lock only specific fields after approval - partial locking is confusing

### Decision 3: Full Audit Logging
**Choice**: Log every edit to NhatKyHeThong with before/after JSON state.

**Rationale**:
- Healthcare compliance requires complete audit trail
- Debugging data issues requires historical view
- Satisfies regulatory requirements for data integrity
- Minimal performance impact with async logging

**Schema**:
```json
{
  "HanhDong": "SUA_GHI_NHAN_HOAT_DONG",
  "ChiTiet": {
    "MaGhiNhan": "uuid",
    "before": { /* old field values */ },
    "after": { /* new field values */ },
    "changedFields": ["TenHoatDong", "SoDiemCPD"]
  }
}
```

### Decision 4: Reuse Single Submission Form Components
**Choice**: Use modal with same form fields as create submission form.

**Rationale**:
- Maintains UI consistency and familiarity
- Reuses existing validation logic
- Pre-populate form with current values
- Minimal new code required

**Alternatives Considered**:
- Inline editing on detail page - more complex state management
- Separate edit page route - unnecessary navigation overhead

### Decision 5: Optimistic Updates with Rollback
**Choice**: Use TanStack Query optimistic updates on frontend.

**Rationale**:
- Immediate UI feedback improves perceived performance
- Query automatically rolls back on error
- Consistent with existing submission list patterns

**Implementation**:
```typescript
const editMutation = useMutation({
  mutationFn: updateSubmission,
  onMutate: async (newData) => {
    await queryClient.cancelQueries(['submission', id]);
    const previous = queryClient.getQueryData(['submission', id]);
    queryClient.setQueryData(['submission', id], newData);
    return { previous };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['submission', id], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries(['submission', id]);
  },
});
```

## Risks / Trade-offs

### Risk 1: Concurrent Edit Conflicts
**Description**: Two admins editing same submission simultaneously.

**Likelihood**: Low (small unit teams, low submission volume)

**Mitigation**: 
- Database-level optimistic locking via timestamp comparison
- Return 409 Conflict if record modified since fetch
- Future enhancement: add `NgayCapNhat` column for version check

### Risk 2: Audit Log Storage Growth
**Description**: Every edit adds NhatKyHeThong record, increasing storage.

**Likelihood**: Medium (depends on edit frequency)

**Mitigation**:
- Async logging to avoid blocking requests
- Archive old audit logs after 2 years (retention policy)
- Index NhatKyHeThong on NgayGio for efficient queries

### Risk 3: Validation Bypass via Direct API Calls
**Description**: Malicious users could bypass frontend validation.

**Likelihood**: Low (authenticated users with business relationship)

**Mitigation**:
- Server-side Zod validation on every PATCH request
- Parameterized queries prevent SQL injection
- Rate limiting on API endpoint (future enhancement)

## Migration Plan

### Phase 1: Backend Implementation (No Breaking Changes)
1. Add `updateSubmission()` method to repository
2. Implement PATCH endpoint with validation
3. Add audit logging
4. Write API tests

### Phase 2: Frontend Implementation
1. Add edit button with conditional rendering
2. Create edit form modal component
3. Integrate TanStack Query mutation
4. Add toast notifications

### Phase 3: Validation and Rollout
1. Test with staging data
2. Deploy to production with feature flag (optional)
3. Monitor audit logs for unexpected patterns
4. Gather user feedback

### Rollback Plan
If issues arise:
1. Remove edit button from UI (immediate mitigation)
2. Add middleware to block PATCH requests
3. Investigate and fix root cause
4. Re-enable after validation

## Open Questions

1. **Should we lock specific fields after creation?**
   - e.g., NgayBatDau, MaHoatDong (activity template)
   - Decision: No - keep all fields editable for v1 simplicity

2. **Should we add edit history view in UI?**
   - Would require new audit log query endpoint
   - Decision: Defer to future iteration, audit log accessible via DB

3. **Should we support draft save (auto-save)?**
   - Could prevent data loss during editing
   - Decision: No - keep edit as atomic operation for v1

4. **Should we notify practitioner when their submission is edited?**
   - Could use email or in-app notification
   - Decision: Defer to future notification system implementation
