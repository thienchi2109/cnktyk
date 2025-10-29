# Loading Notice Standardization

Date: 2025-10-20

Summary
- Introduced a reusable LoadingNotice component for consistent, accessible loading messages.
- Replaced ad-hoc list/table skeletons with a spinner + message across key pages.
- Kept chart skeletons; added inline notices to DB-backed sheets.

Component
- File: src/components/ui/loading-notice.tsx
- Props: message (string), size ('sm'|'md'|'lg' = 'md'), align ('center'|'left' = 'center'), className?
- A11y: role=status, aria-live=polite, spinner aria-hidden.

Integrations
- Lists: Submissions, Practitioners, Users, Activities, Notifications (replace skeletons).
- Sheets: ActivitySubmissionForm (catalog), SubmissionReview (detail), PractitionerDetailSheet (detail).
- Credits page: deferred (charts retain skeletons).

Testing
- TypeScript: 0 errors
- ESLint: 0 errors (warnings non-blocking)

Notes
- Messages localized in Vietnamese, e.g.: "Đang tải danh sách hoạt động...", "Đang tải thông báo...".
- Use size=sm and align='left' within sheets; defaults for list views.
