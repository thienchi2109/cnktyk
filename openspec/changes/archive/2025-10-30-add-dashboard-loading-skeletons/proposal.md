## Why
Users see blank states and layout jumps on the Dashboard while server-side data loads. Loading skeletons improve perceived performance and stability across all roles.

## What Changes
- Add loading skeleton states to all server-side data regions on the Dashboard (cards, charts, tables, KPIs)
- Provide shared Skeleton components and style tokens for visual consistency
- Integrate skeletons with server-side query loading boundaries, including refresh/revalidation flows
- Ensure accessibility (containers marked busy; skeletons not announced; reduced-motion support)
- Non-breaking; no data model or API changes

## Impact
- Affected specs: dashboard
- Affected code: Dashboard layout and widgets; server-side data loading boundaries; shared UI components