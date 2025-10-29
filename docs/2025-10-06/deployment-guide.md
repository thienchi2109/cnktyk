# CNKTYKLT Platform - Production Deployment Guide

## Overview

This guide covers deploying the CNKTYKLT Compliance Management Platform to Cloudflare Pages with Neon PostgreSQL and Cloudflare R2 storage.

## Prerequisites

- [x] Cloudflare account with Pages enabled
- [x] Neon account with production database project
- [x] Cloudflare R2 bucket configured
- [x] Domain name (optional but recommended)
- [x] Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Architecture

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cloudflare CDN  │ (Global Edge Network)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cloudflare Pages│ (Next.js App)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│  Neon  │ │   R2   │
│  DB    │ │ Storage│
└────────┘ └────────┘
```

## Step 1: Prepare Production Database

### 1.1 Create Production Neon Project

```bash
# Using Neon CLI (recommended)
npm install -g neonctl

# Login to Neon
neonctl auth

# Create production project
neonctl projects create --name cnktyklt-production --region aws-us-east-1

# Get connection string
neonctl connection-string cnktyklt-production
```

### 1.2 Run Database Migrations

```bash
# Set production database URL
export DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Run migration script
npx tsx scripts/run-migrations.ts

# Verify schema
npx tsx scripts/test-database.ts
```

### 1.3 Seed Initial Data (Optional)

```bash
# Create initial admin account and units
psql $DATABASE_URL -f docs/seed_accounts.sql

# Or use custom seed script
npx tsx scripts/seed-production.ts
```

### 1.4 Configure Database Security

- Enable connection pooling (PgBouncer)
- Set up IP allowlist (if required)
- Configure SSL/TLS certificates
- Enable audit logging
- Set up automated backups (7-year retention)

## Step 2: Configure Cloudflare R2 Storage

### 2.1 Create Production R2 Bucket

```bash
# Using Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create production bucket
wrangler r2 bucket create cnktyklt-production

# Create preview bucket (for staging)
wrangler r2 bucket create cnktyklt-production-preview
```

### 2.2 Configure CORS Policy

Create `r2-cors-policy.json`:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://cnktyklt.gov.vn", "https://www.cnktyklt.gov.vn"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

Apply CORS policy:

```bash
wrangler r2 bucket cors put cnktyklt-production --config r2-cors-policy.json
```

### 2.3 Generate R2 Access Keys

```bash
# Create API token with R2 permissions
# Go to: Cloudflare Dashboard > R2 > Manage R2 API Tokens
# Create token with:
# - Object Read & Write permissions
# - Specific bucket: cnktyklt-production
```

### 2.4 Configure Public Access (Optional)

```bash
# Enable public access for evidence files (if needed)
wrangler r2 bucket public-access enable cnktyklt-production

# Get public URL
wrangler r2 bucket info cnktyklt-production
```

## Step 3: Deploy to Cloudflare Pages

### 3.1 Connect Git Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages** > **Create a project**
3. Connect your Git provider (GitHub/GitLab/Bitbucket)
4. Select the `cnktyklt-platform` repository
5. Configure build settings:

```yaml
Build command: npm run build
Build output directory: .next
Root directory: /
Environment variables: (see Step 3.2)
```

### 3.2 Configure Environment Variables

In Cloudflare Pages dashboard, add these environment variables:

**Required Variables:**
```bash
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generate-secure-random-string>
AUTH_SECRET=<generate-secure-random-string>

# Database
DATABASE_URL=<neon-production-connection-string>
POSTGRES_URL=<neon-pooled-connection-string>
POSTGRES_PRISMA_URL=<neon-prisma-connection-string>
POSTGRES_URL_NON_POOLING=<neon-direct-connection-string>

# R2 Storage
CF_R2_ACCOUNT_ID=<your-account-id>
CF_R2_ACCESS_KEY_ID=<your-access-key>
CF_R2_SECRET_ACCESS_KEY=<your-secret-key>
CF_R2_BUCKET_NAME=cnktyklt-production
CF_R2_ENDPOINT=<your-r2-endpoint>
CF_R2_PUBLIC_URL=<your-public-url>
```

**Optional Variables:**
```bash
# Monitoring
SENTRY_DSN=<sentry-dsn>
GOOGLE_ANALYTICS_ID=<ga-id>

# Feature Flags
ENABLE_BULK_IMPORT=true
ENABLE_PDF_EXPORT=true
ENABLE_EMAIL_NOTIFICATIONS=false
```

### 3.3 Deploy

```bash
# Option 1: Deploy via Git push (automatic)
git push origin main

# Option 2: Deploy via Wrangler CLI
wrangler pages deploy .next --project-name=cnktyklt-platform

# Option 3: Deploy via GitHub Actions (see Step 5)
```

### 3.4 Verify Deployment

1. Check deployment status in Cloudflare Pages dashboard
2. Visit your deployment URL (e.g., `https://cnktyklt-platform.pages.dev`)
3. Test authentication with admin account
4. Verify database connectivity
5. Test file upload functionality
6. Check all dashboard views

## Step 4: Configure Custom Domain

### 4.1 Add Custom Domain

1. In Cloudflare Pages dashboard, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain: `cnktyklt.gov.vn`
4. Add www subdomain: `www.cnktyklt.gov.vn`

### 4.2 Configure DNS

Cloudflare will automatically configure DNS if your domain is on Cloudflare. Otherwise:

```
Type: CNAME
Name: cnktyklt (or @)
Target: cnktyklt-platform.pages.dev
Proxy: Enabled (orange cloud)
```

### 4.3 Enable SSL/TLS

1. Go to **SSL/TLS** > **Overview**
2. Set encryption mode to **Full (strict)**
3. Enable **Always Use HTTPS**
4. Enable **Automatic HTTPS Rewrites**
5. Configure **Minimum TLS Version** to 1.2 or higher

### 4.4 Update Environment Variables

Update `NEXTAUTH_URL` to use your custom domain:

```bash
NEXTAUTH_URL=https://cnktyklt.gov.vn
```

## Step 5: Set Up CI/CD Pipeline

### 5.1 GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npm run typecheck
      
      - name: Run linter
        run: npm run lint
      
      - name: Build application
        run: npm run build
        env:
          NODE_ENV: production
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: cnktyklt-platform
          directory: .next
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

### 5.2 Configure GitHub Secrets

Add these secrets to your GitHub repository:

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Pages permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

## Step 6: Configure Monitoring & Logging

### 6.1 Enable Cloudflare Analytics

1. Go to **Analytics & Logs** in Cloudflare dashboard
2. Enable **Web Analytics** for your domain
3. Configure **Real User Monitoring (RUM)**

### 6.2 Set Up Error Tracking (Optional)

```bash
# Install Sentry
npm install @sentry/nextjs

# Configure Sentry
npx @sentry/wizard@latest -i nextjs
```

### 6.3 Configure Log Retention

1. Go to **Logs** > **Logpush**
2. Create Logpush job for:
   - HTTP requests
   - Worker logs
   - Security events
3. Configure destination (S3, R2, or external service)

## Step 7: Security Hardening

### 7.1 Configure Security Headers

Add to `next.config.ts`:

```typescript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 7.2 Enable Rate Limiting

Create `middleware.ts` rate limiting:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Too Many Requests', { status: 429 });
  }
  
  return NextResponse.next();
}
```

### 7.3 Configure WAF Rules

1. Go to **Security** > **WAF**
2. Enable **Managed Rules**
3. Create custom rules for:
   - SQL injection protection
   - XSS protection
   - Rate limiting by endpoint
   - Geographic restrictions (if needed)

## Step 8: Performance Optimization

### 8.1 Enable Caching

Configure caching in `next.config.ts`:

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### 8.2 Configure CDN Settings

1. Go to **Caching** > **Configuration**
2. Set **Browser Cache TTL** to 4 hours
3. Enable **Always Online**
4. Enable **Development Mode** during testing (disable for production)

### 8.3 Optimize Database Queries

```sql
-- Create indexes for common queries
CREATE INDEX CONCURRENTLY idx_nhanvien_donvi_status 
ON "NhanVien" ("MaDonVi", "TrangThaiLamViec");

CREATE INDEX CONCURRENTLY idx_ghinhan_nhanvien_time 
ON "GhiNhanHoatDong" ("MaNhanVien", "CreatedAt" DESC);

CREATE INDEX CONCURRENTLY idx_ghinhan_status_time 
ON "GhiNhanHoatDong" ("TrangThaiDuyet", "CreatedAt" DESC);

-- Analyze tables for query optimization
ANALYZE "NhanVien";
ANALYZE "GhiNhanHoatDong";
ANALYZE "TaiKhoan";
```

## Step 9: Backup & Disaster Recovery

### 9.1 Configure Automated Backups

```bash
# Neon automatic backups (enabled by default)
# Retention: 7 days for Free tier, 30 days for Pro

# For longer retention, set up custom backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL | gzip > backup_$DATE.sql.gz

# Upload to R2 or S3
wrangler r2 object put cnktyklt-backups/backup_$DATE.sql.gz --file backup_$DATE.sql.gz
```

### 9.2 Test Restore Procedure

```bash
# Download backup
wrangler r2 object get cnktyklt-backups/backup_20250106.sql.gz --file restore.sql.gz

# Restore to test database
gunzip restore.sql.gz
psql $TEST_DATABASE_URL < restore.sql

# Verify data integrity
npx tsx scripts/verify-backup.ts
```

### 9.3 Document Recovery Procedures

Create `docs/disaster-recovery.md` with:
- Backup locations and access procedures
- Step-by-step restore instructions
- Contact information for emergency support
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 24 hours

## Step 10: Post-Deployment Verification

### 10.1 Smoke Tests

```bash
# Test authentication
curl -X POST https://cnktyklt.gov.vn/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"test"}'

# Test database connectivity
curl https://cnktyklt.gov.vn/api/health/database

# Test file upload
curl -X POST https://cnktyklt.gov.vn/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf"
```

### 10.2 Performance Testing

```bash
# Install k6 for load testing
brew install k6  # macOS
# or download from https://k6.io

# Run load test
k6 run scripts/load-test.js
```

### 10.3 Security Audit

```bash
# Run security scan
npm audit

# Check for vulnerabilities
npm install -g snyk
snyk test

# SSL/TLS check
curl https://www.ssllabs.com/ssltest/analyze.html?d=cnktyklt.gov.vn
```

## Troubleshooting

### Common Issues

**Issue: Build fails with "Module not found"**
```bash
# Solution: Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

**Issue: Database connection timeout**
```bash
# Solution: Check connection pooling settings
# Ensure using pooled connection string
# Increase timeout in connection string:
?connect_timeout=30
```

**Issue: File upload fails**
```bash
# Solution: Verify R2 credentials and CORS
wrangler r2 bucket cors get cnktyklt-production
# Check CF_R2_* environment variables
```

**Issue: Authentication not working**
```bash
# Solution: Verify NEXTAUTH_URL matches deployment URL
# Check NEXTAUTH_SECRET is set correctly
# Clear browser cookies and try again
```

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check system health metrics
- Review security alerts

**Weekly:**
- Review database performance
- Check backup integrity
- Update dependencies (security patches)

**Monthly:**
- Full security audit
- Performance optimization review
- Capacity planning review
- Update documentation

### Scaling Considerations

**Database Scaling:**
- Monitor connection pool usage
- Consider read replicas for reporting
- Implement query caching
- Optimize slow queries

**Application Scaling:**
- Cloudflare Pages auto-scales
- Monitor Worker CPU time
- Optimize bundle size
- Implement code splitting

**Storage Scaling:**
- Monitor R2 storage usage
- Implement file lifecycle policies
- Consider CDN for frequently accessed files
- Archive old evidence files

## Support & Resources

- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages
- **Neon Docs**: https://neon.tech/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Project Repository**: [Your Git Repository URL]
- **Support Email**: support@cnktyklt.gov.vn

## Rollback Procedure

If deployment fails or issues arise:

```bash
# 1. Rollback to previous deployment
wrangler pages deployment list --project-name=cnktyklt-platform
wrangler pages deployment rollback <deployment-id>

# 2. Or redeploy previous Git commit
git revert HEAD
git push origin main

# 3. Verify rollback
curl https://cnktyklt.gov.vn/api/health
```

## Conclusion

Your CNKTYKLT platform is now deployed to production! Monitor the system closely for the first few days and be prepared to make adjustments based on real-world usage patterns.

For questions or issues, refer to the troubleshooting section or contact the development team.
