# Evidence Upload API – Test Suite and Setup

This adds Vitest-based tests for the evidence upload API using Cloudflare R2.

## What’s covered
- 401 when unauthorized
- 400 when no file provided
- 400 invalid file type (schema validation)
- 400 file too large >10MB (schema validation)
- 400 invalid activityId (non-UUID, schema validation)
- 500 when R2 upload reports not configured
- 200 success path: checksum propagation and activity-prefixed filename

## Files
- tests/api/files/upload.test.ts – end-to-end route tests using Next’s Request/Response
- vitest.config.ts – Node test env, `@` alias to `src`
- postcss.config.mjs – Tailwind v4 plugin format fix
- package.json – test scripts and devDeps (vitest, vite)

## Running tests
```bash
npm run test
```
Note: Vite CJS deprecation warning is harmless.

## Mocks and assumptions
- Auth is mocked via getCurrentUser
- R2 client is mocked; no real network calls
- Checksum is mocked to a stable value for assertions

## Troubleshooting
- PostCSS plugin error: ensure postcss.config.mjs uses `{'@tailwindcss/postcss': {}}`

## Next steps
- Add tests for GET /api/files/[filename]?action=metadata, signed-url, exists
- Add tests for DELETE /api/files/[filename] (role checks, not-found, success)
