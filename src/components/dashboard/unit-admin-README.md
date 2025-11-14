# Unit Administrator Dashboard Component

## Overview

The Unit Administrator Dashboard is a comprehensive management interface designed for healthcare unit administrators (DonVi role) to oversee practitioner compliance, manage activity approvals, and monitor unit performance.

## Features

### 1. Unit Overview Header
- **Key Metrics Cards**: Display critical unit statistics
  - Total practitioners in the unit
  - Overall compliance rate
  - Pending approvals count
  - At-risk practitioners requiring attention
- **Quick Actions**: Export reports and access administrative tools
- **Real-time Updates**: Metrics refresh automatically

### 2. Approval Workflow Center
- **Pending Queue**: Priority-sorted list of activities awaiting review
- **Activity Details**: Quick preview with practitioner info, activity type, and credits
- **Aging Indicators**: Visual alerts for activities pending beyond 7 days
- **Quick Actions**: Direct links to detailed review pages
- **Empty State**: Friendly message when no approvals are pending

### 3. Practitioner Management Grid
- **Advanced Search**: Filter by name or license number (CCHN)
- **Status Filtering**: View all, at-risk (<70%), or compliant (≥90%) practitioners
- **Compliance Indicators**: Color-coded badges showing compliance percentage
  - Green: ≥90% (compliant)
  - Amber: 70-89% (warning)
  - Red: <70% (at-risk)
- **Detailed Information**: Name, license ID, position, credits earned/required
- **Quick Access**: Direct links to practitioner profiles
- **Pagination**: Shows first 10 with link to view all

### 4. Unit Analytics
- **Monthly Statistics**: Approved and rejected activities this month
- **Active Practitioners**: Count of currently active staff
- **Trend Indicators**: Visual representation of unit performance
- **Responsive Layout**: Adapts to different screen sizes

## Design System

### Glassmorphism UI
- **Semi-transparent Cards**: Frosted glass effect with backdrop blur
- **Smooth Animations**: Transitions on hover and interaction
- **Healthcare Color Palette**:
  - Medical Blue (#0066CC): Primary actions and metrics
  - Medical Green (#00A86B): Success states and compliance
  - Medical Amber (#F59E0B): Warnings and pending items
  - Medical Red (#DC2626): Critical alerts and at-risk status

### Responsive Behavior
- **Desktop (≥1024px)**: Multi-column layout with all sections expanded
- **Tablet (768-1023px)**: Two-column layout with collapsible sections
- **Mobile (<768px)**: Single-column with collapsible sections and touch-optimized controls

## API Integration

### Endpoints Used
- `GET /api/units/[id]/metrics` - Fetch unit-level metrics
- `GET /api/practitioners?unitId={id}&includeProgress=true` - List practitioners with progress
- `GET /api/submissions?unitId={id}&status=ChoDuyet` - Fetch pending approvals

### Data Flow
1. Component mounts and fetches unit metrics
2. Practitioners list loaded with compliance data
3. Pending approvals fetched and sorted by age
4. Real-time updates via periodic refetch (optional)

## Props

```typescript
interface UnitAdminDashboardProps {
  userId: string;      // Current user's ID
  unitId: string;      // Unit ID for data filtering
}
```

## Usage

```tsx
import { UnitAdminDashboard } from '@/components/dashboard/unit-admin-dashboard';

export default function UnitAdminPage() {
  return (
    <UnitAdminDashboard 
      userId="user-id-here" 
      unitId="unit-id-here" 
    />
  );
}
```

## State Management

### Local State
- `metrics`: Unit-level performance metrics
- `practitioners`: List of practitioners with compliance data
- `pendingApprovals`: Activities awaiting review
- `loading`: Loading state for async operations
- `searchTerm`: Search filter for practitioners
- `filterStatus`: Status filter (all/at-risk/compliant)
- `expandedSections`: Collapsible section states (mobile)

### Effects
- **Metrics Fetch**: Runs on mount and when unitId changes
- **Practitioners Fetch**: Loads with progress data included
- **Approvals Fetch**: Filters by ChoDuyet status

## Accessibility

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **ARIA Labels**: Descriptive labels for screen readers
- **Focus Indicators**: Clear visual focus states
- **Color Contrast**: WCAG 2.1 AA compliant
- **Touch Targets**: Minimum 44x44px on mobile
- **Semantic HTML**: Proper heading hierarchy and structure

## Performance Optimizations

- **Pagination**: Limits initial data load to 10 practitioners
- **Lazy Loading**: Sections load data only when expanded (mobile)
- **Efficient Queries**: Database queries optimized with proper indexes
- **Skeleton States**: Loading placeholders for better perceived performance

## Mobile Optimizations

### Collapsible Sections
- All major sections can be collapsed on mobile
- Chevron icons indicate expand/collapse state
- Smooth height transitions
- Auto-expand on desktop

### Touch-Friendly
- Large touch targets (≥44px)
- Swipe-friendly card layouts
- Bottom sheet modals for forms
- Optimized tap areas

## Future Enhancements

### Planned Features
- **Batch Approval**: Select and approve multiple activities at once
- **Export Functionality**: Download unit reports in CSV/PDF
- **Real-time Notifications**: WebSocket updates for new submissions
- **Advanced Filtering**: More granular practitioner filters
- **Bulk Actions**: Send reminders, update statuses in bulk
- **Custom Views**: Personalized dashboard layouts
- **Data Visualization**: Charts for compliance trends over time

### Performance Improvements
- **Virtual Scrolling**: For large practitioner lists
- **Optimistic Updates**: Immediate UI feedback for actions
- **Caching Strategy**: TanStack Query for efficient data management
- **Progressive Loading**: Load critical data first

## Testing

### Manual Testing Checklist
- [ ] Dashboard loads with correct unit data
- [ ] Metrics display accurate counts
- [ ] Pending approvals show correct activities
- [ ] Search filters practitioners correctly
- [ ] Status filter works (all/at-risk/compliant)
- [ ] Links navigate to correct pages
- [ ] Collapsible sections work on mobile
- [ ] Loading states display properly
- [ ] Empty states show appropriate messages
- [ ] Responsive layout adapts to screen size

### Browser Compatibility
- Chrome/Edge (Chromium) ✓
- Firefox ✓
- Safari ✓
- Mobile browsers (iOS/Android) ✓

## Troubleshooting

### Common Issues

**Dashboard shows no data**
- Verify user has DonVi role
- Check unitId is correctly set in session
- Ensure API endpoints are accessible
- Check browser console for errors

**Metrics not updating**
- Verify API endpoint returns data
- Check network tab for failed requests
- Ensure database queries are correct

**Practitioners not loading**
- Check includeProgress parameter is passed
- Verify practitioner records exist in database
- Ensure proper role-based access control

## Related Components

- `PractitionerDashboard` - Dashboard for practitioners
- `ComplianceProgressCard` - Reusable progress indicator
- `GlassCard` - Base glass component
- `Button` - Standard shadcn buttons with medical variants

## Related Pages

- `/dashboard/unit-admin` - Main unit admin dashboard route
- `/practitioners` - Full practitioner management
- `/submissions` - Activity submission management
- `/practitioners/[id]` - Individual practitioner details

## Documentation

- Design Spec: `.kiro/specs/compliance-management-platform/design.md`
- Requirements: `.kiro/specs/compliance-management-platform/requirements.md`
- Tasks: `.kiro/specs/compliance-management-platform/tasks.md`
