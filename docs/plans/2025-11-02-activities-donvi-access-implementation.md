# Activities Page Access for DonVi Users - Implementation Plan

**Date:** 2025-11-02
**Status:** Ready for Implementation
**Target:** Extend Activities page from SoYTe-only to DonVi users with unit isolation

## Overview

This document outlines the implementation of Activities page access for DonVi (unit admin) users while maintaining proper unit isolation. DonVi users can create/view/update activities within their unit and view global activities created by SoYTe, but cannot edit SoYTe activities.

## Current State

- Activities page (`/src/app/(authenticated)/activities/page.tsx`) accessible only to SoYTe users
- API endpoints restrict all write operations to SoYTe role
- Activities stored in `DanhMucHoatDong` table without unit association
- No unit isolation mechanism exists

## Requirements

1. **Access Control:** DonVi users can access Activities page
2. **Unit Isolation:** DonVi users only see activities within their unit + global SoYTe activities
3. **Permission Model:**
   - DonVi: Read global + unit activities; Write only unit activities
   - SoYTe: Full access to all activities (global + unit)
4. **UI:** Tabbed interface for DonVi users (Global vs Unit activities)

## Implementation Plan

### Phase 1: Database Schema Changes

#### 1.1 Database Migration
**File:** Database migration script
**Changes:**
```sql
-- Add unit association column
ALTER TABLE DanhMucHoatDong
ADD COLUMN MaDonVi UUID REFERENCES DonVi(MaDonVi);

-- Backfill existing activities as global
UPDATE DanhMucHoatDong SET MaDonVi = NULL WHERE MaDonVi IS NULL;

-- Add index for performance
CREATE INDEX idx_danhmuc_hoatdong_donvi ON DanhMucHoatDong(MaDonVi);
```

#### 1.2 Schema Updates
**File:** `/src/lib/db/schemas.ts`
**Changes:**
- Add `MaDonVi: UUIDSchema.nullable()` to `DanhMucHoatDongSchema`
- Update Create/Update schemas accordingly
- Add validation for unit assignment

### Phase 2: Repository Layer Updates

#### 2.1 Enhanced Repository Methods
**File:** `/src/lib/db/repositories.ts`
**New Methods:**
```typescript
// Get unit-specific activities
findByUnit(unitId: string): Promise<DanhMucHoatDong[]>

// Get global activities (SoYTe created)
findGlobal(): Promise<DanhMucHoatDong[]>

// Get activities accessible by user with permissions
findAccessibleByUser(userRole: string, unitId?: string): Promise<{
  global: DanhMucHoatDong[];
  unit: DanhMucHoatDong[];
}>

// Check if user can modify activity
canUserModifyActivity(activityId: string, userRole: string, unitId?: string): Promise<boolean>
```

**Modified Methods:**
- Update `create()` to handle unit assignment
- Update `findAll()` to support user-based filtering
- Add ownership validation in `update()` and `delete()`

### Phase 3: API Layer Updates

#### 3.1 Activities List Endpoint
**File:** `/src/app/api/activities/route.ts`
**GET Method Changes:**
```typescript
// Add query parameters
const scope = searchParams.get('scope'); // 'global', 'unit', 'all'
const unitId = searchParams.get('unitId');

// Return structured data for tabbed interface
return NextResponse.json({
  global: globalActivities,
  unit: unitActivities,
  permissions: {
    canCreate: user.role === 'SoYTe' || user.role === 'DonVi',
    canEditGlobal: user.role === 'SoYTe',
    canEditUnit: user.role === 'SoYTe' || user.role === 'DonVi'
  }
});
```

#### 3.2 Activity Creation Endpoint
**POST Method Changes:**
```typescript
// Allow DonVi users to create activities
if (user.role !== 'SoYTe' && user.role !== 'DonVi') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// Auto-assign unit for DonVi users
const activityData = {
  ...validatedData,
  MaDonVi: user.role === 'DonVi' ? user.unitId : null
};
```

#### 3.3 Activity Update/Delete Endpoints
**File:** `/src/app/api/activities/[id]/route.ts`
**Permission Checks:**
```typescript
// Verify ownership for DonVi users
if (user.role === 'DonVi') {
  const activity = await danhMucHoatDongRepo.findById(id);
  if (activity.MaDonVi !== user.unitId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
```

### Phase 4: Frontend Component Updates

#### 4.1 ActivitiesList Component
**File:** `/src/components/activities/activities-list.tsx`
**Key Changes:**

**Permission Logic:**
```typescript
const canManageActivities = (userRole: string, activityMaDonVi: string | null, userUnitId?: string) => {
  if (userRole === 'SoYTe') return true;  // Full access
  if (userRole === 'DonVi' && activityMaDonVi === userUnitId) return true;  // Unit activities only
  return false;
};

const canCreateActivities = (userRole: string) => {
  return userRole === 'SoYTe' || userRole === 'DonVi';
};
```

**Tabbed Interface:**
```typescript
// Show tabs for DonVi users only
if (userRole === 'DonVi') {
  return (
    <Tabs defaultValue="unit" className="space-y-6">
      <TabsList>
        <TabsTrigger value="unit">Unit Activities</TabsTrigger>
        <TabsTrigger value="global">Global Activities</TabsTrigger>
      </TabsList>

      <TabsContent value="unit">
        {/* Unit activities with full CRUD */}
      </TabsContent>

      <TabsContent value="global">
        {/* Global activities - read only */}
      </TabsContent>
    </Tabs>
  );
}
```

#### 4.2 Page Component Updates
**File:** `/src/app/(authenticated)/activities/page.tsx`
**Changes:**
- Pass `userUnitId` to ActivitiesList
- Handle tabbed data fetching
- Update form submission to work with unit assignment

#### 4.3 Activity Form Component
**File:** `/src/components/activities/activity-form.tsx`
**Changes:**
- Remove role-based restrictions (allow DonVi)
- Auto-assign unit based on current user
- Add visual indicators for unit vs global activities

### Phase 5: Testing Strategy

#### 5.1 Permission Testing
**Test Cases:**
- DonVi user can create unit activities ✅
- DonVi user can edit own unit activities ✅
- DonVi user CANNOT edit SoYTe activities ❌
- DonVi user can view global activities ✅
- SoYTe user maintains full access ✅
- Unit isolation between different DonVi units ✅

#### 5.2 UI/UX Testing
**Test Cases:**
- Tabbed interface renders correctly for DonVi users
- SoYTe users see existing unified interface
- Activity creation works for both user types
- Visual distinction between global and unit activities
- Responsive design on mobile devices

#### 5.3 Integration Testing
**Test Cases:**
- API endpoints return correct data for each user role
- Database constraints enforce unit isolation
- Form submissions properly assign unit ownership
- Error handling for unauthorized operations

### Phase 6: Deployment Considerations

#### 6.1 Database Migration
- Run migration during maintenance window
- Verify data integrity after migration
- Test rollback procedure

#### 6.2 Feature Flag Considerations
- Consider using feature flags for gradual rollout
- Monitor performance impact of new queries
- Log permission denials for debugging

#### 6.3 User Communication
- Update user documentation
- Communicate changes to DonVi administrators
- Provide training materials for new functionality

## Implementation Checklist

### Database Changes
- [ ] Write and test migration script
- [ ] Update schema definitions
- [ ] Add database constraints and indexes
- [ ] Verify data integrity

### Backend Changes
- [ ] Implement new repository methods
- [ ] Update API endpoints with permission logic
- [ ] Add error handling for unauthorized access
- [ ] Write unit tests for repository layer

### Frontend Changes
- [ ] Update ActivitiesList component with tabs
- [ ] Implement permission-based UI controls
- [ ] Modify page component for DonVi access
- [ ] Update activity form component
- [ ] Add visual indicators for activity ownership

### Testing
- [ ] Write integration tests for API endpoints
- [ ] Test permission boundaries
- [ ] Verify UI functionality for both user roles
- [ ] Performance testing with new queries

### Documentation
- [ ] Update API documentation
- [ ] Create user guide for DonVi administrators
- [ ] Document permission model
- [ ] Update troubleshooting guides

## Success Criteria

1. **Functional Requirements:**
   - DonVi users can access Activities page
   - Unit isolation properly enforced
   - Permission model works as specified
   - Tabbed interface functions correctly

2. **Non-Functional Requirements:**
   - No performance regression
   - Maintainable code structure
   - Comprehensive test coverage
   - Clear error messages

3. **User Experience:**
   - Intuitive interface for DonVi users
   - No breaking changes for SoYTe users
   - Clear visual distinction between activity types
   - Responsive design maintained

## Risks and Mitigations

**Risk 1:** Database migration fails
**Mitigation:** Test migration in staging environment, prepare rollback procedure

**Risk 2:** Permission bypass vulnerability
**Mitigation:** Comprehensive permission testing, defense-in-depth validation

**Risk 3:** Performance impact of additional queries
**Mitigation:** Add database indexes, monitor query performance

**Risk 4:** User confusion about activity ownership
**Mitigation:** Clear UI indicators, user documentation, training materials

## Next Steps

1. **Immediate:** Create and test database migration script
2. **Week 1:** Implement repository layer changes and API updates
3. **Week 2:** Develop frontend components and test integration
4. **Week 3:** Comprehensive testing and documentation
5. **Week 4:** User acceptance testing and deployment preparation

---

**Document Status:** Complete - Ready for implementation review and approval