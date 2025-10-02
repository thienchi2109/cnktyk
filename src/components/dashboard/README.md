# Practitioner Dashboard Components

## Overview
Adaptive, mobile-first dashboard for healthcare practitioners with glassmorphism UI design. Built for Task 12 of the CNKTYKLT Compliance Management Platform.

## Components

### PractitionerDashboard
Main dashboard component with comprehensive compliance tracking and activity management.

**Location**: `src/components/dashboard/practitioner-dashboard.tsx`

**Features**:
- Personal progress hero card with circular progress indicator
- Activity management with timeline view
- Priority alerts and notifications panel
- Personal analytics with credit distribution
- Mobile-optimized with collapsible sections
- Real-time data updates

**Props**:
```typescript
interface PractitionerDashboardProps {
  userId: string; // User account ID
}
```

**Usage**:
```tsx
import { PractitionerDashboard } from '@/components/dashboard/practitioner-dashboard';

<PractitionerDashboard userId={session.user.id} />
```

### ActivityTimeline
Mobile-optimized activity timeline with swipe gestures for navigation.

**Location**: `src/components/dashboard/activity-timeline.tsx`

**Features**:
- Swipe gestures for mobile navigation (left/right)
- Card-based view on mobile with pagination dots
- List view on desktop with hover effects
- Status badges with color coding
- Reviewer comments display

**Props**:
```typescript
interface ActivityTimelineProps {
  activities: Activity[];
  loading?: boolean;
}

interface Activity {
  id: string;
  title: string;
  type: string;
  credits: number;
  status: 'DaDuyet' | 'ChoDuyet' | 'TuChoi' | 'YeuCauBoSung';
  date: string;
  reviewerComment?: string;
}
```

**Usage**:
```tsx
import { ActivityTimeline } from '@/components/dashboard/activity-timeline';

<ActivityTimeline 
  activities={recentActivities} 
  loading={loadingActivities} 
/>
```

## Hooks

### useMediaQuery
Responsive breakpoint detection for mobile optimization.

**Location**: `src/hooks/use-media-query.ts`

**Exports**:
- `useMediaQuery(query: string)` - Generic media query hook
- `useIsMobile()` - Detects mobile devices (≤768px)
- `useIsTablet()` - Detects tablets (769px-1023px)
- `useIsDesktop()` - Detects desktop (≥1024px)

**Usage**:
```tsx
import { useIsDesktop, useIsMobile } from '@/hooks/use-media-query';

const isDesktop = useIsDesktop();
const isMobile = useIsMobile();
```

## Page Routes

### /dashboard/practitioner
Dedicated dashboard page for practitioners (NguoiHanhNghe role).

**Location**: `src/app/dashboard/practitioner/page.tsx`

**Access Control**: 
- Only accessible to users with `NguoiHanhNghe` role
- Automatic redirect to `/dashboard` for other roles

## Design Features

### Glassmorphism UI
- Semi-transparent cards with backdrop blur
- Smooth transitions and hover effects
- Healthcare-themed color palette
- Medical iconography throughout

### Mobile Optimizations
- **Collapsible Sections**: Expandable/collapsible content areas on mobile
- **Swipe Gestures**: Touch-friendly navigation for activity timeline
- **Responsive Grid**: Adaptive layouts for different screen sizes
- **Sticky Progress**: Progress indicator remains visible during scroll
- **Bottom Sheet Modals**: Mobile-friendly modal presentations

### Healthcare Theme Colors
- **Medical Blue** (#0066CC): Primary actions and progress
- **Medical Green** (#00A86B): Success states and approvals
- **Medical Amber** (#F59E0B): Warnings and pending items
- **Medical Red** (#DC2626): Errors and rejections

## Data Integration

### API Endpoints Used
- `/api/practitioners` - Fetch practitioner information
- `/api/submissions` - Recent activity submissions
- `/api/credits/cycle` - Compliance cycle data
- `/api/notifications` - Alerts and notifications

### Data Hooks
- `useCreditCycle` - Compliance cycle and credit information
- `useNotifications` - Real-time notifications
- Custom state management for activities

## Responsive Breakpoints

- **Mobile**: < 768px
  - Single column layout
  - Collapsible sections
  - Swipe navigation
  - Bottom navigation bar

- **Tablet**: 768px - 1023px
  - Two column layout
  - Collapsible sidebar
  - Touch-optimized controls

- **Desktop**: ≥ 1024px
  - Multi-column layout
  - All sections expanded by default
  - Header navigation bar
  - Hover interactions

## Performance Considerations

- **Lazy Loading**: Components load data on demand
- **Optimistic Updates**: Immediate UI feedback
- **Skeleton States**: Loading placeholders for better UX
- **Pagination**: Limited data fetching (5-10 items)
- **Memoization**: Prevent unnecessary re-renders

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **ARIA Labels**: Proper semantic markup
- **Focus Management**: Clear focus indicators
- **Color Contrast**: WCAG 2.1 AA compliant
- **Screen Reader**: Compatible with assistive technologies

## Future Enhancements

- [ ] Real-time WebSocket updates
- [ ] Offline mode with service workers
- [ ] Push notifications
- [ ] Advanced data visualization
- [ ] Customizable dashboard widgets
- [ ] Export functionality
- [ ] Dark mode support

## Related Components

- `ComplianceProgressCard` - Circular progress indicator
- `CreditSummaryChart` - Credit distribution visualization
- `CreditHistoryTable` - Activity history table
- `NotificationDropdown` - Header notification bell
- `GlassCard`, `GlassButton` - Base UI components

## Testing

To test the practitioner dashboard:

1. Sign in as a practitioner user (role: `NguoiHanhNghe`)
2. Navigate to `/dashboard` (auto-redirects to `/dashboard/practitioner`)
3. Test mobile view by resizing browser to < 768px
4. Test swipe gestures on activity timeline (mobile only)
5. Test collapsible sections on mobile
6. Verify data loading and error states

## Vietnamese Language Support

All UI text is in Vietnamese:
- Tín chỉ (Credits)
- Hoạt động (Activities)
- Thông báo (Notifications)
- Tuân thủ (Compliance)
- Đã duyệt (Approved)
- Chờ duyệt (Pending)
- Từ chối (Rejected)
