# Submissions: React Query Integration and API shape update

Date: 2025-10-20

Summary
- Standardized submissions API list response to `{ data, pagination }`.
- Integrated TanStack Query for:
  - Submissions list with prefetch-next-page
  - Submission detail + review mutation
  - Activities catalog (stale forever)
- Reduced duplicate fetches and enabled caching.

API Changes
- GET /api/submissions
  - Before: `{ success, submissions, pagination }`
  - Now: `{ data, pagination }`

Client Changes
- SubmissionsList
  - Uses `useSubmissions({ page, limit, status, search })` with placeholderData to keep previous page while fetching.
  - Reads `data.data` and `data.pagination`.
- SubmissionReview
  - Uses `useSubmission(id)` for detail.
  - Uses `useReviewSubmissionMutation()` for approve/reject/request-info; invalidates `submissions` and updates detail cache on success.
- ActivitySubmissionForm
  - Uses `useActivities()` (staleTime: Infinity) and hydrates local `activityCatalog` state.

Hooks Added
- `src/hooks/use-submissions.ts` (list)
- `src/hooks/use-submission.ts` (detail + mutation)
- `src/hooks/use-activities.ts` (catalog)

Notes
- Query defaults provided by QueryProvider (staleTime, gcTime) remain in effect.
- Remove any leftover client-side fetch code as you touch related files in future PRs.
