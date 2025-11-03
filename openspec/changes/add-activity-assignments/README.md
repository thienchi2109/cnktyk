# Add Activity Assignments (Mandatory Training)

**Status**: Draft / Awaiting Review  
**Created**: 2025-11-03  
**Author**: AI Assistant  
**Validation**: ✅ Passed strict validation

---

## Overview

This change adds a **mandatory training assignment** system to complement the existing voluntary activity submission workflow. DonVi admins can now:
- Assign catalog activities to groups of practitioners using cohort filters
- Set optional deadlines for compliance tracking
- Monitor completion rates via admin dashboard
- Send automated reminders for upcoming/overdue assignments

Practitioners gain:
- Clear visibility into required activities via "My Assignments" page
- Seamless fulfillment flow (assignment → submission → approval)
- Deadline tracking with days remaining indicators

---

## Key Files

- **`proposal.md`**: Full problem statement, solution design, impact analysis
- **`design.md`**: Technical design (data model, API contracts, state machine, performance)
- **`tasks.md`**: Implementation checklist organized by phase (10 task groups, 80+ items)
- **`specs/`**: Spec deltas for 3 affected capabilities
  - `activity-assignments/spec.md` - New capability with 9 requirements
  - `activity-submission/spec.md` - Modified to support assignment linking
  - `cohort-builder/spec.md` - Extended for assignment context

---

## What's New

### Database
- New table `GanHoatDong` (assignments) with 11 fields
- New enum `assignment_status` (5 states)
- 4 indexes for query optimization
- Bidirectional FK linking assignments ↔ submissions

### API Endpoints
- `POST /api/assignments/bulk` - Bulk create assignments from cohort
- `GET /api/assignments/my-assignments` - Practitioner assignment list
- `GET /api/assignments/tracking` - Admin compliance dashboard
- `POST /api/assignments/:id/remind` - Send reminder notifications
- `DELETE /api/assignments/:id` - Soft delete assignment

### UI Components
- `/my-assignments` page (practitioners) - List with deadline tracking
- `/assignments/tracking` page (admins) - Compliance dashboard with stats
- `AssignmentWizard` component - Multi-step assignment creation
- Assignment context banner in submission form
- Bulk reminder controls on tracking dashboard

### Integrations
- Reuses existing `CohortBuilder` component for selection
- Integrates with `ThongBao` (notifications) for reminders
- Links to `GhiNhanHoatDong` (submissions) for completion
- Audit logging via `NhatKyHeThong`

---

## Business Value

### Time Savings
- **Before**: 2 hours manual tracking per training cycle
- **After**: 15 minutes bulk assignment + automated tracking
- **Savings**: 87.5% reduction in admin overhead

### Compliance Improvement
- **Target**: Increase on-time completion from 65% → 85%
- **Method**: Visibility, reminders, deadline tracking, escalation

### Risk Reduction
- Zero "I didn't know this was required" incidents
- Complete audit trail for regulatory compliance
- Clear accountability chain (assigned → started → completed)

---

## Implementation Phases

| Phase | Focus                      | Duration | Deliverable                        |
|-------|----------------------------|----------|------------------------------------|
| 1     | Core Infrastructure        | 2 weeks  | Backend functional, API ready      |
| 2     | Practitioner Experience    | 1 week   | `/my-assignments` page live        |
| 3     | Admin Tools                | 1 week   | Assignment wizard + dashboard      |
| 4     | Automation & Polish        | 1 week   | Notifications, tests, docs         |
| 5     | Pilot & Rollout            | 2+ weeks | 3 pilot units → full deployment    |

**Total**: 7+ weeks from kickoff to full rollout

---

## Dependencies

### Reused Components
- ✅ Cohort Builder (existing, no changes)
- ✅ Notification system (existing, add new event types)
- ✅ Audit logging (existing, add new actions)
- ✅ Activity catalog (existing, reference only)

### New Dependencies
- None (all built using existing stack)

---

## Risks & Mitigations

| Risk                  | Mitigation                                      |
|-----------------------|-------------------------------------------------|
| Practitioners ignore  | Automated reminders + escalation + visibility   |
| Duplicate bugs        | UNIQUE constraint + idempotent API + tests      |
| Performance issues    | Indexes + pagination + load testing             |
| Notification spam     | Configurable frequency + digest mode            |

---

## Success Metrics

### Quantitative
- 80% unit adoption within 3 months
- 85% on-time completion rate
- <3s bulk assignment creation (500 practitioners)
- <2s dashboard rendering (1000 assignments)

### Qualitative
- 4/5+ satisfaction rating (post-pilot survey)
- <5% support tickets
- "Significant reduction in manual work" (admin feedback)

---

## Next Steps

1. **Stakeholder Review**: Share proposal with DonVi admins, practitioners, SoYTe
2. **Approval**: Obtain sign-off from product owner and technical lead
3. **Kickoff**: Assign dev team, set sprint goals
4. **Implementation**: Follow `tasks.md` checklist phase by phase
5. **Pilot**: Deploy to 3 units for 2-week validation
6. **Rollout**: Enable feature flag for all units after pilot success

---

## Questions or Feedback?

Contact: [Insert Contact Info]  
Related Work: See `openspec/changes/archive/2025-10-26-add-cohort-builder-dynamic-groups/` for cohort builder foundation

---

**Validation Status**: ✅ All spec deltas pass `openspec validate --strict`  
**Dependencies**: ✅ All blocked tasks identified and tracked  
**Readiness**: 🟢 Ready for stakeholder review and approval gate
