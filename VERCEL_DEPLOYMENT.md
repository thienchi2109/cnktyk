# Vercel Deployment Guide for CNKTYKLT Platform

## Prerequisites

Before deploying, ensure you have:
- ✅ GitHub account with repository access
- ✅ Vercel account (sign up at [vercel.com](https://vercel.com))
- ✅ Neon PostgreSQL database (already configured)
- ✅ Cloudflare R2 bucket (already configured: `cnktyklt-syt`)

## Quick Setup

### 1. Install Vercel CLI (Optional but Recommended)
```bash
npm install -g vercel
```

### 2. Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended for First Deploy)
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import your repository: `thienchi2109/cnktyk`
4. Configure project settings:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)
5. Click **"Deploy"** (will fail first time - need to add env vars)

#### Option B: Using Vercel CLI
```bash
# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Follow prompts to link project
```

### 3. Configure Environment Variables (CRITICAL!)

Go to: **Project Settings → Environment Variables**

Add each variable for **Production**, **Preview**, and **Development** environments.

---

#### 🔐 Authentication (Required)

```bash
# Your production URL (update after first deploy)
NEXTAUTH_URL=https://your-project.vercel.app

# Generate a secure secret key
NEXTAUTH_SECRET=<paste output from command below>

# Generate with:
openssl rand -base64 32
```

⚠️ **Important**: After first deploy, update `NEXTAUTH_URL` with your actual Vercel URL.

---

#### 🗄️ Database (Required)

```bash
DATABASE_URL=postgresql://neondb_owner:npg_wciGYM7AypC8@ep-fragrant-pine-adxuf4ke-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

Copy from your `.env.local` file.

---

#### 📦 Cloudflare R2 Storage (Required for File Features)

**⚠️ CRITICAL: R2 storage is required for evidence file uploads/downloads**

```bash
CF_R2_ACCOUNT_ID=643c80a3c4819db1be3f8e7174ad8501
CF_R2_ACCESS_KEY_ID=3c7fc058aa8dc59d644cfc796cef9638
CF_R2_SECRET_ACCESS_KEY=7bb161344a5bbb06231608025eefe06dd4f0f29e0d5032c5724b556424be87af
CF_R2_BUCKET_NAME=cnktyklt-syt
CF_R2_ENDPOINT=https://643c80a3c4819db1be3f8e7174ad8501.r2.cloudflarestorage.com
CF_R2_PUBLIC_URL=https://pub-3e9de70adc454c988e484c10a520c045.r2.dev
```

Copy these **exactly** from your `.env.local` file.

**Features that require R2:**
- Evidence file uploads
- File viewer/preview
- Document downloads
- Activity evidence management

**Without R2**: The app will run but file features will be disabled with warning messages.

---

### 4. Redeploy After Adding Environment Variables

After adding all environment variables:

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click **"⋯" menu** → **"Redeploy"**
4. Select **"Use existing Build Cache"**
5. Click **"Redeploy"**

Or trigger a new deployment:
```bash
git commit --allow-empty -m "Trigger deployment"
git push
```

---

### 5. Update NEXTAUTH_URL

After successful deployment:

1. Copy your Vercel deployment URL (e.g., `https://cnktyk.vercel.app`)
2. Go to **Settings → Environment Variables**
3. Edit `NEXTAUTH_URL` variable
4. Update value to your deployment URL: `https://cnktyk.vercel.app`
5. **Redeploy** (important!)

---

### 6. Verify R2 Storage Connection

Test file upload functionality:

1. Visit your deployed app
2. Sign in with credentials
3. Go to `/files/demo` page
4. Try uploading a test file
5. Verify file appears and can be downloaded

Check R2 bucket:
```bash
wrangler r2 object list cnktyklt-syt
```

---

### 7. Custom Domain (Optional)

Add your custom domain:

1. **Vercel Dashboard** → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter: `cnktyklt.gov.vn` (or your domain)
4. Follow DNS configuration instructions
5. Update `NEXTAUTH_URL` to `https://cnktyklt.gov.vn`
6. **Redeploy**

---

### 8. Deployment Regions

Your app is configured for **Singapore** (`sin1`) - optimal for Vietnam.

Available regions:
- `sin1` - Singapore ⚡ (closest to Vietnam)
- `hkg1` - Hong Kong
- `icn1` - Seoul
- `hnd1` - Tokyo

To change region, edit `vercel.json`:
```json
{
  "regions": ["sin1"]
}
```

---

## Automatic Deployments

Vercel automatically deploys on git push:

- **Production**: `main` branch → `https://cnktyk.vercel.app`
- **Preview**: Other branches → `https://cnktyk-git-[branch].vercel.app`

Each preview deployment gets:
- Unique URL
- Same environment variables
- Full production features
- Isolated database (uses same DATABASE_URL)

## Build Configuration

The app is configured for optimal Vercel deployment:
- ✅ Server-side rendering (SSR) enabled
- ✅ API routes supported
- ✅ Middleware enabled
- ✅ NextAuth integration
- ✅ Image optimization for R2 storage
- ✅ TypeScript checking during build

---

## Environment Variables Checklist

Use this checklist when adding variables to Vercel:

- [ ] `NEXTAUTH_URL` - Set to Vercel URL (update after first deploy)
- [ ] `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- [ ] `DATABASE_URL` - Copy from `.env.local`
- [ ] `CF_R2_ACCOUNT_ID` - `643c80a3c4819db1be3f8e7174ad8501`
- [ ] `CF_R2_ACCESS_KEY_ID` - `3c7fc058aa8dc59d644cfc796cef9638`
- [ ] `CF_R2_SECRET_ACCESS_KEY` - `7bb161344a5bbb06231608025eefe06dd4f0f29e0d5032c5724b556424be87af`
- [ ] `CF_R2_BUCKET_NAME` - `cnktyklt-syt`
- [ ] `CF_R2_ENDPOINT` - `https://643c80a3c4819db1be3f8e7174ad8501.r2.cloudflarestorage.com`
- [ ] `CF_R2_PUBLIC_URL` - `https://pub-3e9de70adc454c988e484c10a520c045.r2.dev`
- [ ] All variables added to **Production** environment
- [ ] All variables added to **Preview** environment (for testing)
- [ ] Redeployed after adding variables

---

## Troubleshooting

### ❌ Build Fails

**Test locally first:**
```bash
# Clean build
rm -rf .next
npm run build

# Check TypeScript
npm run typecheck

# Check linting
npm run lint
```

**Common issues:**
- TypeScript errors → Fix in code
- Missing dependencies → Run `npm install`
- Build timeout → Contact Vercel support

---

### ❌ "Error: Invalid credentials" on R2 Upload

**Solution**: Verify R2 environment variables in Vercel

```bash
# Test R2 credentials locally
wrangler r2 object list cnktyklt-syt
```

1. Check all R2 variables are set correctly
2. No extra spaces or quotes
3. Copy-paste directly from `.env.local`
4. Redeploy after fixing

---

### ❌ NextAuth "Configuration Error"

**Solution**: Check `NEXTAUTH_URL` and `NEXTAUTH_SECRET`

1. Verify `NEXTAUTH_URL` matches deployment URL exactly
2. Include `https://` protocol
3. No trailing slash
4. Generate new `NEXTAUTH_SECRET`: `openssl rand -base64 32`
5. Redeploy

---

### ❌ Files Upload But Can't Download

**Solution**: Check R2 public access

1. Go to Cloudflare Dashboard → R2 → `cnktyklt-syt`
2. Verify **Public Access** is enabled
3. Test public URL: `https://pub-3e9de70adc454c988e484c10a520c045.r2.dev/test.txt`
4. Check CORS configuration (see `docs/r2-storage-setup.md`)

---

### ❌ Database Connection Errors

**Solution**: Verify Neon database URL

1. Check `DATABASE_URL` format:
   ```
   postgresql://user:password@host/database?sslmode=require
   ```
2. Ensure SSL mode is included: `?sslmode=require`
3. Test connection:
   ```bash
   npm run verify:production
   ```

---

### ❌ Environment Variables Not Working

**Solution**: Variables must be set for correct environment

1. Go to **Settings → Environment Variables**
2. Each variable should have checkmarks for:
   - ✅ Production
   - ✅ Preview
   - ✅ Development (optional)
3. After adding/changing variables: **Always redeploy**

---

### 📋 How to Check Deployment Logs

1. Go to **Vercel Dashboard**
2. Click your project
3. **Deployments** tab
4. Click on a deployment
5. View tabs:
   - **Build Logs** - Build process output
   - **Functions Logs** - API routes and server logs
   - **Runtime Logs** - Real-time application logs

Look for:
- R2 configuration warnings
- Database connection errors
- NextAuth errors

---

## Testing Checklist

After deployment, verify these features:

### Authentication
- [ ] Can visit login page: `/auth/signin`
- [ ] Can login with test credentials
- [ ] Redirects to correct dashboard based on role
- [ ] Can logout successfully

### Database
- [ ] Dashboard loads data (activities, practitioners)
- [ ] Can create new records
- [ ] Data persists after refresh

### R2 File Storage
- [ ] Go to `/files/demo` page
- [ ] Upload test file (PDF, image)
- [ ] File appears in list
- [ ] Can preview/download file
- [ ] Check file in R2: `wrangler r2 object list cnktyklt-syt`

### API Routes
- [ ] `/api/auth/session` returns session
- [ ] `/api/activities` returns data
- [ ] `/api/files/upload` works

---

## Performance Optimization

### Enable Vercel Analytics (Optional)

1. **Vercel Dashboard** → **Analytics**
2. Click **"Enable Analytics"**
3. Free tier: 100k events/month

### Enable Speed Insights (Optional)

```bash
npm install @vercel/speed-insights
```

Add to `src/app/layout.tsx`:
```tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## Local Development

Test with production environment variables:

```bash
# Create production env file
cp .env.local .env.production.local

# Run production build locally
npm run build
npm start

# Test on http://localhost:3000
```

---

## Monitoring & Logs

### Real-time Logs

```bash
# Install Vercel CLI
npm install -g vercel

# View production logs
vercel logs --follow

# View specific deployment logs
vercel logs [deployment-url]
```

### Log Drains (Advanced)

Send logs to external service:

1. **Settings** → **Log Drains**
2. Add drain:
   - Datadog
   - LogDNA
   - Splunk
   - Custom webhook

---

## Security Best Practices

### 1. Rotate R2 Access Keys Regularly

```bash
# Generate new R2 API token in Cloudflare
# Update Vercel env vars
# Redeploy
```

### 2. Use Separate Keys for Preview/Production

Consider using different R2 buckets:
- Production: `cnktyklt-syt-production`
- Preview: `cnktyklt-syt-preview`

### 3. Enable Vercel Authentication (Optional)

For staging environments:

1. **Settings** → **Deployment Protection**
2. Enable **Vercel Authentication**
3. Only authenticated users can access previews

---

## Cost Estimation

### Vercel Costs (Hobby Plan - Free)
- 100 GB bandwidth/month
- Unlimited deployments
- Free SSL
- **$0/month** (hobby tier)

### Vercel Pro ($20/month)
- 1 TB bandwidth
- Team collaboration
- Custom domains
- Analytics included

### R2 Storage Costs
- Storage: $0.015/GB/month
- Operations: ~$0.02/month for typical usage
- Bandwidth: **Free** (no egress fees!)

**Total estimate**: Free on Vercel Hobby + ~$0.50/month for R2

---

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **R2 Docs**: https://developers.cloudflare.com/r2/
- **Neon Docs**: https://neon.tech/docs

---

## Quick Reference

### Vercel Dashboard URLs

- **Project**: https://vercel.com/[username]/cnktyk
- **Deployments**: https://vercel.com/[username]/cnktyk/deployments
- **Settings**: https://vercel.com/[username]/cnktyk/settings
- **Logs**: https://vercel.com/[username]/cnktyk/logs

### Important Commands

```bash
# Deploy to production
git push origin main

# Deploy preview
git push origin feature-branch

# Local production build
npm run build && npm start

# View logs
vercel logs --follow

# List deployments
vercel ls

# Check environment variables
vercel env ls
```

---

## Success Criteria

Your deployment is successful when:

✅ Build completes without errors  
✅ App loads at Vercel URL  
✅ Can login with credentials  
✅ Dashboard shows data from Neon database  
✅ Can upload files to R2 storage  
✅ Files can be downloaded/previewed  
✅ No console errors in browser  
✅ All API routes respond correctly  

---

## Next Steps After Deployment

1. **Set up custom domain** (optional)
2. **Configure R2 custom domain** for production (replace dev URL)
3. **Enable Vercel Analytics** for monitoring
4. **Set up log drains** for centralized logging
5. **Create backup strategy** for database
6. **Document production URLs** for team
7. **Set up monitoring alerts**

Your app is ready for production! 🚀
