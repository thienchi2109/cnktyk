# Cloudflare Pages Setup Guide

## Quick Start

This guide walks you through setting up Cloudflare Pages for the CNKTYKLT platform.

## Prerequisites

- Cloudflare account
- Git repository (GitHub, GitLab, or Bitbucket)
- Wrangler CLI installed: `npm install -g wrangler`

## Step 1: Login to Cloudflare

```bash
wrangler login
```

This will open a browser window for authentication.

## Step 2: Create Pages Project

### Option A: Via Dashboard (Recommended for first-time setup)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** > **Create application** > **Pages**
3. Click **Connect to Git**
4. Select your repository: `cnktyklt-platform`
5. Configure build settings:

```yaml
Production branch: main
Build command: npm run build
Build output directory: .next
Root directory: /
Node version: 20
```

6. Click **Save and Deploy**

### Option B: Via Wrangler CLI

```bash
# Create project
wrangler pages project create cnktyklt-platform

# Deploy
npm run build
wrangler pages deploy .next --project-name=cnktyklt-platform
```

## Step 3: Configure Environment Variables

### Required Variables

Go to **Settings** > **Environment variables** and add:

```bash
# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
AUTH_SECRET=<same-as-nextauth-secret>

# Database (Neon)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
POSTGRES_URL=postgresql://user:pass@host-pooler/db?sslmode=require
POSTGRES_PRISMA_URL=postgresql://user:pass@host-pooler/db?sslmode=require&pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://user:pass@host/db?sslmode=require

# Neon Details
PGHOST=your-host.neon.tech
PGUSER=neondb_owner
PGPASSWORD=your-password
PGDATABASE=neondb
NEON_PROJECT_ID=your-project-id

# Cloudflare R2
CF_R2_ACCOUNT_ID=your-account-id
CF_R2_ACCESS_KEY_ID=your-access-key
CF_R2_SECRET_ACCESS_KEY=your-secret-key
CF_R2_BUCKET_NAME=cnktyklt-production
CF_R2_ENDPOINT=https://account-id.r2.cloudflarestorage.com/bucket
CF_R2_PUBLIC_URL=https://your-r2-domain.com

# Application
NODE_ENV=production
NEXT_PUBLIC_DEFAULT_LOCALE=vi
```

### Generate Secure Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Step 4: Configure Custom Domain

### Add Domain

1. Go to **Custom domains** tab
2. Click **Set up a custom domain**
3. Enter your domain: `cnktyklt.gov.vn`
4. Click **Continue**

### DNS Configuration

If your domain is on Cloudflare:
- DNS records will be automatically configured
- SSL certificate will be automatically provisioned

If your domain is external:
```
Type: CNAME
Name: cnktyklt (or @)
Target: cnktyklt-platform.pages.dev
```

### SSL/TLS Settings

1. Go to **SSL/TLS** > **Overview**
2. Set encryption mode: **Full (strict)**
3. Enable **Always Use HTTPS**
4. Enable **Automatic HTTPS Rewrites**

## Step 5: Configure Build Settings

### Build Configuration

**Important:** For Cloudflare Pages, build configuration is primarily managed through the dashboard or GitHub Actions, not `wrangler.toml`.

Configure in Cloudflare Pages dashboard:
```yaml
Build command: npm run build
Build output directory: .next
Root directory: /
Node version: 20
```

The `wrangler.toml` file is used for:
- R2 bucket bindings
- KV namespace bindings (optional)
- Compatibility flags
- Environment-specific settings

### Node.js Compatibility

The `wrangler.toml` includes `nodejs_compat` flag for Next.js:

```toml
compatibility_flags = ["nodejs_compat"]
```

This is automatically applied when deploying.

## Step 6: Set Up R2 Bindings

### Create R2 Bucket

```bash
wrangler r2 bucket create cnktyklt-production
```

### Configure Bucket Binding

Add to `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "EVIDENCE_FILES"
bucket_name = "cnktyklt-production"
```

### Set CORS Policy

```bash
# Create cors-policy.json
cat > cors-policy.json << EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://cnktyklt.gov.vn"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

# Apply CORS policy
wrangler r2 bucket cors put cnktyklt-production --config cors-policy.json
```

## Step 7: Configure GitHub Actions

### Add Repository Secrets

Go to **Settings** > **Secrets and variables** > **Actions**

Add these secrets:
- `CLOUDFLARE_API_TOKEN`: Create at Cloudflare Dashboard > API Tokens
- `CLOUDFLARE_ACCOUNT_ID`: Found in Cloudflare Dashboard URL
- `NEXTAUTH_SECRET`: Generated secure random string
- `NEXTAUTH_URL`: Your production URL
- `DATABASE_URL`: Neon production connection string
- `DATABASE_URL_PREVIEW`: Neon preview/staging connection string

### Token Permissions

Create API token with these permissions:
- **Account** > **Cloudflare Pages** > **Edit**
- **Zone** > **DNS** > **Edit** (if using custom domain)

## Step 8: Deploy

### Manual Deployment

```bash
# Build application
npm run build

# Deploy to production
npm run deploy:production

# Or deploy preview
npm run deploy:preview
```

### Automatic Deployment

Push to main branch:
```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

GitHub Actions will automatically:
1. Run type checking
2. Run linting
3. Build application
4. Deploy to Cloudflare Pages

## Step 9: Verify Deployment

### Run Verification Script

```bash
# Set production environment variables
export DATABASE_URL="your-production-db-url"
export NEXTAUTH_URL="https://cnktyklt.gov.vn"
export CF_R2_BUCKET_NAME="cnktyklt-production"

# Run verification
npm run verify:production
```

### Manual Verification

1. Visit your production URL
2. Test login functionality
3. Check database connectivity
4. Test file upload
5. Verify all dashboards load correctly

## Step 10: Monitor Deployment

### View Logs

```bash
# View deployment logs
wrangler pages deployment list --project-name=cnktyklt-platform

# View specific deployment
wrangler pages deployment tail <deployment-id>
```

### Analytics

1. Go to **Analytics & Logs** in Cloudflare dashboard
2. Enable **Web Analytics**
3. Monitor:
   - Page views
   - Response times
   - Error rates
   - Geographic distribution

## Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Environment Variables Not Working

1. Check variable names match exactly
2. Redeploy after adding variables
3. Check for typos in variable values

### Database Connection Issues

```bash
# Test connection locally
npx tsx scripts/test-database.ts

# Check connection string format
# Should include: ?sslmode=require
```

### R2 Upload Fails

```bash
# Verify R2 credentials
wrangler r2 bucket list

# Check CORS configuration
wrangler r2 bucket cors get cnktyklt-production
```

## Rollback

### Via Dashboard

1. Go to **Deployments** tab
2. Find previous successful deployment
3. Click **...** > **Rollback to this deployment**

### Via CLI

```bash
# List deployments
wrangler pages deployment list --project-name=cnktyklt-platform

# Rollback to specific deployment
wrangler pages deployment rollback <deployment-id>
```

## Best Practices

1. **Always test in preview first**
   - Create PR to trigger preview deployment
   - Test thoroughly before merging

2. **Use environment-specific variables**
   - Separate production and preview configs
   - Never commit secrets to Git

3. **Monitor after deployment**
   - Check error logs for first 24 hours
   - Monitor performance metrics
   - Watch for unusual patterns

4. **Keep dependencies updated**
   - Regular security updates
   - Test updates in preview first

5. **Backup before major changes**
   - Database backup
   - Configuration backup
   - Document changes

## Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs)
- [R2 Documentation](https://developers.cloudflare.com/r2)

## Support

For issues or questions:
- Check deployment logs in Cloudflare dashboard
- Review GitHub Actions logs
- Run verification script: `npm run verify:production`
- Contact: support@cnktyklt.gov.vn
