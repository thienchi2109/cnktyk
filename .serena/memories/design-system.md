# Design System

## Glassmorphism Design Language

The platform implements a modern glassmorphism design system that conveys professionalism and trust while maintaining excellent usability for healthcare professionals.

## Visual Design Principles

### Glassmorphism Effects
- Frosted glass cards with subtle blur and transparency
- Semi-transparent backgrounds with backdrop blur
- Subtle drop shadows and glass reflections for hierarchy

### Healthcare Color Palette
- **Primary**: Medical Blue (#0066CC) with glass variants
- **Secondary**: Medical Green (#00A86B) for success states
- **Warning**: Medical Amber (#F59E0B) for alerts
- **Danger**: Medical Red (#DC2626) for critical alerts
- **Neutral**: Cool grays with glass transparency

### Typography
- Clean, readable fonts optimized for data-heavy interfaces
- Proper hierarchy with heading levels
- Sufficient line height for readability

### Spacing
- Generous whitespace with consistent 8px grid system
- Proper padding and margins for breathing room
- Consistent component spacing

## Component Design Patterns

### Glass Components
- **GlassCard**: Semi-transparent cards with backdrop blur
- **GlassButton**: Interactive buttons with glass effects and hover animations
- **GlassInput**: Form inputs with glass styling and floating labels
- **Glass Navigation**: Sidebar with smooth transitions
- **Glass Modals**: Frosted glass overlays with backdrop blur

### Data Visualization
- **Progress Indicators**: Circular progress rings and glass progress bars
- **Charts**: Glass-framed charts with custom styling
- **KPI Cards**: Glass metric cards with trend indicators
- **Timeline Views**: Glass timeline components showing activity history

### Interactive Elements
- **Hover Effects**: Subtle glow and depth changes
- **Focus Indicators**: High-contrast focus rings
- **Loading States**: Skeleton components with glass effects
- **Transitions**: Smooth animations using CSS transforms

## Responsive Design

### Breakpoints
- **sm**: 640px (mobile)
- **md**: 768px (tablet)
- **lg**: 1024px (desktop)
- **xl**: 1280px (large desktop)

### Mobile-First Approach
- Progressive enhancement from mobile to desktop
- Touch-optimized interactions (minimum 44px touch targets)
- Adaptive layouts (sidebar collapses to drawer on mobile)
- Simplified glass effects on lower-end devices

### Touch Optimizations
- Larger touch targets for glass buttons on mobile
- Swipe gestures for glass card interactions
- Bottom sheet modals for mobile forms
- Floating action buttons with contextual actions

## Accessibility Features

### WCAG 2.1 AA Compliance
- Proper contrast ratios despite glass effects
- Enhanced contrast for text over glass backgrounds
- Color-independent information conveyance

### Keyboard Navigation
- Full keyboard accessibility
- High-contrast focus indicators that work with glass effects
- Skip links to bypass decorative elements

### Screen Reader Support
- Semantic HTML structure
- Proper heading hierarchy
- Descriptive ARIA labels for interactive elements

### Reduced Motion
- Respect user preferences for reduced motion
- Disable heavy animations on low battery
- Fallback to solid backgrounds when needed

## Performance Considerations

### Glass Effects Optimization
- CSS-based backdrop-filter with hardware acceleration
- GPU-accelerated transitions using CSS transforms
- Inline critical glassmorphism styles for faster initial render
- Reduced glass effects on lower-end devices

### Animation Performance
- Use CSS transforms instead of position changes
- Limit simultaneous animations
- Disable non-essential animations on mobile
- Battery-aware animation throttling
