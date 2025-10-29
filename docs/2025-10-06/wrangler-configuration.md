# Wrangler Configuration for Cloudflare Pages

## Important Notes

The `wrangler.toml` file for Cloudflare Pages is **different** from Workers configuration. Pages projects use a simplified configuration.

## What wrangler.toml Controls

For Cloudflare Pages, `wrangler.toml` is used for:

1. **R2 Bucket Bindings** - Connect file storage
2. **KV Namespace Bindings** - Connect key-value storage (optional)
3. **Compatibility Flags** - Enable Node.js APIs
4. **Environment Settings** - Production vs Preview configurations

## What wrangler.toml Does NOT Control

These are configured in the Cloudflare Pages dashboard or GitHub Actions:

- ❌ Build command
- ❌ Build output directory
- ❌ Root directory
- ❌ Environment variables (set in dashboard)

## Current Configuration

```toml
name = "cnktyklt-platform"
compatibility_date = "2025-01-10"
compatibility_flags = ["nodejs_compat"]

# R2 bucket bindings
[[r2_buckets]]
binding = "EVIDENCE_FILES"
bucket_name = "cnktyklt-syt"
preview_bucket_name = "cnktyklt-syt-preview"

# Production environment
[env.production]
NODE_VERSION = "20"

[[env.production.r2_buckets]]
binding = "EVIDENCE_FILES"
bucket_name = "cnktyklt-production"

# Preview environment
[env.preview]
NODE_VERSION = "20"

[[env.preview.r2_buckets]]
binding = "EVIDENCE_FILES"
bucket_name = "cnktyklt-syt-preview"
```

## Build Configuration (Dashboard)

Configure these in Cloudflare Pages dashboard:

```yaml
Production branch: main
Build command: npm run build
Build output directory: .next
Root directory: /
Node version: 20
```

## Environment Variables (Dashboard)

Set these in **Settings** > **Environment variables**:

```bash
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<secure-random-string>
DATABASE_URL=<neon-connection-string>
CF_R2_ACCESS_KEY_ID=<r2-access-key>
CF_R2_SECRET_ACCESS_KEY=<r2-secret-key>
CF_R2_BUCKET_NAME=cnktyklt-production
# ... etc
```

## Deployment Methods

### Method 1: Git Push (Recommended)

```bash
git push origin main
```

Cloudflare Pages automatically:
1. Detects the push
2. Runs build command
3. Deploys to production

### Method 2: Wrangler CLI

```bash
# Build first
npm run build

# Deploy
wrangler pages deploy .next --project-name=cnktyklt-platform
```

### Method 3: GitHub Actions

Automatic deployment via `.github/workflows/deploy-production.yml`

## Common Issues

### Issue: "Configuration file for Pages projects does not support 'build'"

**Solution:** Remove `[build]` section from `wrangler.toml`. Build configuration is set in the dashboard.

### Issue: "watch_dirs" unexpected field

**Solution:** Remove `watch_dirs` from `wrangler.toml`. This is for Workers, not Pages.

### Issue: Bindings not inherited by environments

**Solution:** Define bindings separately for each environment:

```toml
# ✅ Correct
[env.production]
[[env.production.r2_buckets]]
binding = "EVIDENCE_FILES"
bucket_name = "cnktyklt-production"

# ❌ Incorrect - won't be inherited
[[r2_buckets]]
binding = "EVIDENCE_FILES"
bucket_name = "cnktyklt-production"

[env.production]
# Missing r2_buckets here
```

## Accessing Bindings in Code

### R2 Bucket Access

```typescript
// In API route or server component
export const runtime = 'edge';

export async function POST(request: Request) {
  // Access R2 bucket via environment
  const bucket = process.env.EVIDENCE_FILES;
  
  // Or use AWS SDK with credentials
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CF_R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.CF_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY!,
    },
  });
}
```

### KV Namespace Access (if configured)

```typescript
// Access KV namespace
const sessions = process.env.SESSIONS;
await sessions.get('session-key');
await sessions.put('session-key', 'value');
```

## Validation

To validate your `wrangler.toml`:

```bash
# This will show warnings/errors
wrangler pages deploy .next --project-name=cnktyklt-platform --dry-run
```

## References

- [Cloudflare Pages Configuration](https://developers.cloudflare.com/pages/platform/functions/bindings/)
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Pages vs Workers Configuration](https://developers.cloudflare.com/pages/platform/functions/)

## Summary

✅ **Use wrangler.toml for:**
- R2 bindings
- KV bindings
- Compatibility flags
- Environment-specific settings

❌ **Don't use wrangler.toml for:**
- Build commands
- Build output directory
- Environment variables
- Watch directories

Configure build settings and environment variables in the Cloudflare Pages dashboard instead.
