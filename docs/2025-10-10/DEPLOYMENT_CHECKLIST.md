# Vercel Deployment Checklist

Complete this checklist to deploy CNKTYKLT Platform to Vercel with full R2 storage support.

---

## Pre-Deployment

- [ ] GitHub repository is up to date
- [ ] All local changes are committed and pushed
- [ ] `.env.local` file is configured and working locally
- [ ] Local build succeeds: `npm run build`
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] App runs locally: `npm start`

---

## Create Vercel Project

- [ ] Sign in to [vercel.com](https://vercel.com)
- [ ] Click "Add New Project"
- [ ] Import repository: `thienchi2109/cnktyk`
- [ ] Verify framework detection: Next.js
- [ ] Keep default build settings
- [ ] Click "Deploy" (will fail - need env vars)

---

## Configure Environment Variables

Go to: **Project Settings → Environment Variables**

### Authentication Variables

- [ ] Add `NEXTAUTH_URL` (temporarily use `https://your-project.vercel.app`)
- [ ] Generate `NEXTAUTH_SECRET`:
  ```bash
  openssl rand -base64 32
  ```
- [ ] Add `NEXTAUTH_SECRET` with generated value

### Database Variables

- [ ] Add `DATABASE_URL` from `.env.local`:
  ```
  postgresql://neondb_owner:npg_wciGYM7AypC8@ep-fragrant-pine-adxuf4ke-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
  ```

### R2 Storage Variables (CRITICAL!)

Copy these exactly from `.env.local`:

- [ ] `CF_R2_ACCOUNT_ID` = `643c80a3c4819db1be3f8e7174ad8501`
- [ ] `CF_R2_ACCESS_KEY_ID` = `3c7fc058aa8dc59d644cfc796cef9638`
- [ ] `CF_R2_SECRET_ACCESS_KEY` = `7bb161344a5bbb06231608025eefe06dd4f0f29e0d5032c5724b556424be87af`
- [ ] `CF_R2_BUCKET_NAME` = `cnktyklt-syt`
- [ ] `CF_R2_ENDPOINT` = `https://643c80a3c4819db1be3f8e7174ad8501.r2.cloudflarestorage.com`
- [ ] `CF_R2_PUBLIC_URL` = `https://pub-3e9de70adc454c988e484c10a520c045.r2.dev`

### Environment Selection

For EACH variable above:
- [ ] Check ✅ **Production**
- [ ] Check ✅ **Preview**
- [ ] Check ✅ **Development** (optional)

---

## Redeploy After Adding Variables

- [ ] Go to **Deployments** tab
- [ ] Click latest deployment → **"⋯" menu** → **"Redeploy"**
- [ ] Wait for deployment to complete
- [ ] Check deployment status: Should be ✅ Ready

---

## Update NEXTAUTH_URL

- [ ] Copy your Vercel deployment URL (e.g., `https://cnktyk.vercel.app`)
- [ ] Go to **Settings → Environment Variables**
- [ ] Click `NEXTAUTH_URL` → **Edit**
- [ ] Update value to actual URL: `https://cnktyk.vercel.app`
- [ ] Click **Save**
- [ ] **Redeploy** again (important!)

---

## Verify Deployment

### 1. Basic Access

- [ ] Visit deployment URL
- [ ] Page loads without errors
- [ ] No console errors in browser DevTools

### 2. Authentication

- [ ] Visit `/auth/signin`
- [ ] Can see login form
- [ ] Login with test credentials
- [ ] Redirects to dashboard after login
- [ ] Can logout successfully

### 3. Database Connection

- [ ] Dashboard displays data (activities, practitioners, etc.)
- [ ] No database connection errors
- [ ] Can create/update records
- [ ] Data persists after refresh

### 4. R2 File Storage (CRITICAL!)

- [ ] Go to `/files/demo` page
- [ ] Upload button is enabled (not grayed out)
- [ ] Upload a test file (PDF or image)
- [ ] File upload succeeds
- [ ] File appears in file list
- [ ] Can click to preview/download file
- [ ] No R2 configuration warnings in browser console

### 5. Verify R2 File Actually Uploaded

```bash
# Check R2 bucket contents
wrangler r2 object list cnktyklt-syt

# You should see your uploaded file
```

- [ ] File appears in R2 bucket list

### 6. API Routes

Test these endpoints:

- [ ] `/api/auth/session` - Returns session or null
- [ ] `/api/activities` - Returns activities list
- [ ] `/api/practitioners` - Returns practitioners list
- [ ] `/api/files/upload` - Accepts file uploads

---

## Check Deployment Logs

- [ ] Go to **Deployments → [Latest] → Build Logs**
- [ ] No build errors
- [ ] Check **Functions Logs** for runtime errors
- [ ] Look for R2 configuration warnings

Expected: **No** warnings like:
```
Cloudflare R2 not configured. File upload/download features will be disabled.
```

---

## Performance Check

- [ ] Page loads in < 3 seconds
- [ ] Images load properly
- [ ] API requests respond quickly
- [ ] No infinite loading states

---

## Security Check

- [ ] Protected routes redirect to login when not authenticated
- [ ] Can't access admin routes with regular user
- [ ] API routes require authentication
- [ ] Environment variables not exposed in client

---

## Optional: Custom Domain

If setting up custom domain:

- [ ] Go to **Settings → Domains**
- [ ] Add domain: `cnktyklt.gov.vn`
- [ ] Configure DNS records as shown
- [ ] Wait for DNS propagation (up to 48h)
- [ ] Update `NEXTAUTH_URL` to `https://cnktyklt.gov.vn`
- [ ] Redeploy

---

## Optional: R2 Custom Domain (Production)

For production, replace dev URL with custom domain:

- [ ] Go to Cloudflare R2 → `cnktyklt-syt` → **Settings**
- [ ] **Custom Domains** → Add domain: `files.cnktyklt.gov.vn`
- [ ] Update `CF_R2_PUBLIC_URL` in Vercel to `https://files.cnktyklt.gov.vn`
- [ ] Redeploy

---

## Post-Deployment

- [ ] Document production URL for team
- [ ] Share credentials with authorized users
- [ ] Set up monitoring/alerts (optional)
- [ ] Enable Vercel Analytics (optional)
- [ ] Create backup schedule for database
- [ ] Test all critical user flows
- [ ] Monitor logs for first few hours

---

## Troubleshooting Reference

### If R2 uploads fail:

1. Check all R2 env vars are set correctly
2. No extra spaces or quotes in variables
3. Redeploy after fixing
4. Test R2 credentials: `wrangler r2 object list cnktyklt-syt`

### If authentication fails:

1. Verify `NEXTAUTH_URL` matches deployment URL exactly
2. Check `NEXTAUTH_SECRET` is at least 32 characters
3. Redeploy after changes

### If database errors:

1. Verify `DATABASE_URL` includes `?sslmode=require`
2. Test connection: `npm run verify:production`
3. Check Neon dashboard for database status

---

## Success Criteria

✅ All checklist items completed  
✅ Build succeeds  
✅ App accessible at Vercel URL  
✅ Authentication works  
✅ Database connected  
✅ **R2 file uploads working**  
✅ **Files can be downloaded**  
✅ No console errors  
✅ No server errors in logs  

---

## Emergency Rollback

If deployment has critical issues:

1. Go to **Deployments**
2. Find last working deployment
3. Click **"⋯" menu** → **"Promote to Production"**
4. Fix issues locally before redeploying

---

## Support

- Vercel Issues: Check **Deployments → Logs**
- R2 Issues: `wrangler r2 --help`
- Database Issues: Check Neon dashboard
- App Issues: Check browser console

---

**Deployment Date**: _____________  
**Deployed By**: _____________  
**Production URL**: _____________  
**Status**: ⬜ In Progress  ⬜ Complete  ⬜ Issues Found

---

For detailed instructions, see: `VERCEL_DEPLOYMENT.md`
