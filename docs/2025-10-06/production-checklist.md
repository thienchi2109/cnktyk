# Production Deployment Checklist

Use this checklist to ensure all steps are completed before and after production deployment.

## Pre-Deployment Checklist

### 1. Code Quality ✅

- [ ] All TypeScript errors resolved (`npm run typecheck`)
- [ ] ESLint warnings reviewed and addressed (`npm run lint`)
- [ ] Code reviewed and approved by team
- [ ] All tests passing (if implemented)
- [ ] No console.log statements in production code
- [ ] No commented-out code blocks
- [ ] All TODO comments addressed or documented

### 2. Database Preparation ✅

- [ ] Production Neon project created
- [ ] Database schema migrated (`npx tsx scripts/run-migrations.ts`)
- [ ] Database connection tested (`npx tsx scripts/test-database.ts`)
- [ ] Indexes created for performance
- [ ] Initial data seeded (`npm run seed:production`)
- [ ] Admin account created and password secured
- [ ] Connection pooling configured
- [ ] Backup strategy configured (7-year retention)
- [ ] Database credentials secured in environment variables

### 3. File Storage (R2) ✅

- [ ] Production R2 bucket created
- [ ] CORS policy configured
- [ ] Access keys generated and secured
- [ ] Public access configured (if needed)
- [ ] File size limits tested (10MB max)
- [ ] File type validation tested (PDF/JPG/PNG)
- [ ] Bucket lifecycle policies configured
- [ ] R2 credentials secured in environment variables

### 4. Environment Configuration ✅

- [ ] `.env.production.template` reviewed
- [ ] All required environment variables set in Cloudflare Pages
- [ ] `NEXTAUTH_SECRET` generated with secure random string (32+ chars)
- [ ] `NEXTAUTH_URL` set to production domain (HTTPS)
- [ ] `NODE_ENV` set to `production`
- [ ] Database URLs configured (pooled and direct)
- [ ] R2 credentials configured
- [ ] No development/test credentials in production
- [ ] Environment variables documented

### 5. Security Configuration ✅

- [ ] HTTPS enabled and enforced
- [ ] SSL/TLS certificate configured (Full strict mode)
- [ ] Security headers configured in `next.config.ts`
- [ ] CORS policy configured correctly
- [ ] Rate limiting configured (if applicable)
- [ ] WAF rules configured in Cloudflare
- [ ] IP allowlist configured (if required)
- [ ] Session timeout configured (8 hours)
- [ ] Password hashing verified (bcrypt, cost factor 10)
- [ ] JWT token expiration configured

### 6. Domain & DNS ✅

- [ ] Custom domain configured in Cloudflare Pages
- [ ] DNS records configured correctly
- [ ] SSL certificate provisioned and active
- [ ] WWW redirect configured (if applicable)
- [ ] Domain verified and accessible
- [ ] `NEXTAUTH_URL` updated to custom domain

### 7. Monitoring & Logging ✅

- [ ] Cloudflare Analytics enabled
- [ ] Error tracking configured (Sentry, optional)
- [ ] Log retention configured
- [ ] Alert thresholds configured
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring configured (optional)

### 8. CI/CD Pipeline ✅

- [ ] GitHub Actions workflows configured
- [ ] Repository secrets added to GitHub
- [ ] Cloudflare API token created with correct permissions
- [ ] Preview deployments tested
- [ ] Production deployment workflow tested
- [ ] Rollback procedure documented and tested

### 9. Documentation ✅

- [ ] Deployment guide reviewed (`docs/deployment-guide.md`)
- [ ] Cloudflare Pages setup guide reviewed (`docs/cloudflare-pages-setup.md`)
- [ ] README.md updated with production information
- [ ] Environment variables documented
- [ ] API documentation up to date
- [ ] User guides prepared (if applicable)
- [ ] Disaster recovery procedures documented

### 10. Testing ✅

- [ ] Local build successful (`npm run build`)
- [ ] Preview deployment tested
- [ ] Authentication flow tested
- [ ] Database operations tested
- [ ] File upload/download tested
- [ ] All user roles tested (SoYTe, DonVi, NguoiHanhNghe, Auditor)
- [ ] All dashboards tested
- [ ] Mobile responsiveness tested
- [ ] Cross-browser compatibility tested
- [ ] Performance tested (load times, database queries)
- [ ] Security tested (XSS, SQL injection, CSRF)

## Deployment Steps

### 1. Final Verification

```bash
# Run production verification script
npm run verify:production
```

Expected output: All checks should pass ✅

### 2. Build Application

```bash
# Clean build
rm -rf .next node_modules
npm install
npm run build:check
```

### 3. Deploy to Production

**Option A: Automatic (via Git push)**
```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

**Option B: Manual (via Wrangler CLI)**
```bash
npm run deploy:production
```

### 4. Verify Deployment

- [ ] Visit production URL
- [ ] Check deployment status in Cloudflare dashboard
- [ ] Test login with admin account
- [ ] Verify database connectivity
- [ ] Test file upload functionality
- [ ] Check all dashboard views
- [ ] Verify API endpoints
- [ ] Check error logs

## Post-Deployment Checklist

### Immediate (Within 1 Hour) ✅

- [ ] Production URL accessible
- [ ] SSL certificate active and valid
- [ ] Login functionality working
- [ ] Database queries executing correctly
- [ ] File uploads working
- [ ] All dashboards loading
- [ ] No critical errors in logs
- [ ] Performance metrics acceptable (< 3s page load)

### Short-term (Within 24 Hours) ✅

- [ ] Monitor error logs for issues
- [ ] Check database performance
- [ ] Verify file storage operations
- [ ] Monitor user authentication
- [ ] Check API response times
- [ ] Review security logs
- [ ] Verify backup completion
- [ ] Test all user workflows

### Medium-term (Within 1 Week) ✅

- [ ] User feedback collected
- [ ] Performance optimization applied (if needed)
- [ ] Security audit completed
- [ ] Database query optimization (if needed)
- [ ] Documentation updated based on deployment experience
- [ ] Team training completed
- [ ] Support procedures established

## Rollback Procedure

If critical issues are discovered:

### 1. Immediate Rollback

```bash
# Via Wrangler CLI
wrangler pages deployment list --project-name=cnktyklt-platform
wrangler pages deployment rollback <previous-deployment-id>
```

### 2. Via Cloudflare Dashboard

1. Go to **Deployments** tab
2. Find last known good deployment
3. Click **...** > **Rollback to this deployment**

### 3. Verify Rollback

- [ ] Previous version accessible
- [ ] All functionality working
- [ ] Database state verified
- [ ] Users notified (if applicable)

### 4. Document Issue

- [ ] Issue documented in incident log
- [ ] Root cause identified
- [ ] Fix planned and scheduled
- [ ] Team notified

## Emergency Contacts

**Technical Team:**
- Lead Developer: [Name] - [Email] - [Phone]
- DevOps Engineer: [Name] - [Email] - [Phone]
- Database Admin: [Name] - [Email] - [Phone]

**Service Providers:**
- Cloudflare Support: https://dash.cloudflare.com/support
- Neon Support: https://neon.tech/docs/introduction/support
- Emergency Hotline: [Phone Number]

## Maintenance Windows

**Scheduled Maintenance:**
- Day: [Day of week]
- Time: [Time range]
- Duration: [Expected duration]
- Notification: [How users are notified]

**Emergency Maintenance:**
- Approval required from: [Role/Person]
- Maximum downtime: [Time limit]
- Communication plan: [How to notify users]

## Success Criteria

Deployment is considered successful when:

- ✅ All pre-deployment checks passed
- ✅ Deployment completed without errors
- ✅ All post-deployment checks passed
- ✅ No critical errors in first 24 hours
- ✅ Performance metrics meet targets
- ✅ User feedback is positive
- ✅ Security audit passed

## Notes

**Deployment Date:** _________________

**Deployed By:** _________________

**Deployment Version:** _________________

**Issues Encountered:** 
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Lessons Learned:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Next Steps:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
