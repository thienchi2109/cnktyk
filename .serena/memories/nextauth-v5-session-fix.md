# NextAuth v5 Session Configuration Fix

## Issue
401 Unauthorized error when SessionProvider tries to fetch session:
```
ClientFetchError: Not authenticated
at fetchData (client.js:39:22)
```

## Root Cause
1. Middleware was blocking `/api/auth/*` endpoints
2. SessionProvider needed explicit configuration for NextAuth v5
3. JWT expiry was too short (5 minutes) causing frequent re-authentication

## Solution Applied

### 1. Middleware Update (`middleware.ts`)
Added all NextAuth API endpoints to PUBLIC_ROUTES:
```typescript
const PUBLIC_ROUTES = [
  "/",
  "/auth/signin",
  "/auth/error",
  "/api/auth/signin",
  "/api/auth/signout",
  "/api/auth/callback",
  "/api/auth/csrf",
  "/api/auth/providers",
  "/api/auth/session",  // Critical for SessionProvider
  "/api/auth/error",
];
```

### 2. SessionProvider Configuration (`src/components/providers/session-provider.tsx`)
Added explicit NextAuth v5 configuration:
```typescript
<SessionProvider 
  basePath="/api/auth"
  refetchInterval={0}           // Disable auto-refresh
  refetchOnWindowFocus={false}  // Disable refetch on focus
>
```

### 3. Auth Config Update (`src/lib/auth/config.ts`)
- Added `basePath: "/api/auth"` to authConfig
- Removed short JWT expiry (was 5 minutes)
- Kept session maxAge at 8 hours

## Result
- ✅ No more 401 errors
- ✅ Session persists properly
- ✅ Client-side session fetching works
- ✅ All auth endpoints accessible
