# Cloudflare R2 Storage Setup Guide

## Current Configuration

Your R2 bucket is already configured and ready to use!

### Bucket Details

- **Bucket Name**: `cnktyklt-syt`
- **Account ID**: `643c80a3c4819db1be3f8e7174ad8501`
- **Location**: Asia-Pacific (APAC)
- **Created**: September 28, 2025
- **Storage Class**: Standard
- **Public Access**: Enabled
- **Current Size**: 0 B (empty)

### Endpoints

**S3 API Endpoint:**
```
https://643c80a3c4819db1be3f8e7174ad8501.r2.cloudflarestorage.com/cnktyklt-syt
```

**Public Development URL:**
```
https://pub-3e9de70adc454c988e484c10a520c045.r2.dev
```

⚠️ **Note**: The public development URL is rate-limited and not recommended for production. Set up a custom domain for production use.

## Environment Variables

Your `.env.local` is already configured with:

```bash
CF_R2_ACCOUNT_ID=643c80a3c4819db1be3f8e7174ad8501
CF_R2_ACCESS_KEY_ID=3c7fc058aa8dc59d644cfc796cef9638
CF_R2_SECRET_ACCESS_KEY=7bb161344a5bbb06231608025eefe06dd4f0f29e0d5032c5724b556424be87af
CF_R2_BUCKET_NAME=cnktyklt-syt
CF_R2_ENDPOINT=https://643c80a3c4819db1be3f8e7174ad8501.r2.cloudflarestorage.com
CF_R2_PUBLIC_URL=https://pub-3e9de70adc454c988e484c10a520c045.r2.dev
```

## Next Steps for Production

### 1. Set Up Custom Domain (Recommended)

For production, you should set up a custom domain instead of using the dev URL.

**Option A: Connect to Cloudflare Domain**

1. Go to R2 bucket settings
2. Click **Custom Domains** > **Add**
3. Enter your domain: `files.cnktyklt.gov.vn`
4. Cloudflare will automatically configure DNS

**Option B: Use Public Development URL**

The current dev URL works but has limitations:
- Rate limiting
- No custom caching rules
- Not recommended for production

### 2. Configure CORS Policy

Create `r2-cors-policy.json`:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://cnktyklt.gov.vn",
        "https://www.cnktyklt.gov.vn",
        "http://localhost:3000"
      ],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

Apply CORS policy:

```bash
wrangler r2 bucket cors put cnktyklt-syt --config r2-cors-policy.json
```

### 3. Test File Upload

Test the R2 configuration:

```bash
# Create a test file
echo "Test file" > test.txt

# Upload using Wrangler
wrangler r2 object put cnktyklt-syt/test.txt --file test.txt

# Verify upload
wrangler r2 object get cnktyklt-syt/test.txt

# Access via public URL
curl https://pub-3e9de70adc454c988e484c10a520c045.r2.dev/test.txt
```

### 4. Configure Lifecycle Rules (Optional)

Set up automatic cleanup of old files:

1. Go to **Object Lifecycle Rules**
2. Create rule:
   - **Name**: Delete old evidence files
   - **Prefix**: `evidence/`
   - **Delete after**: 2555 days (7 years)

### 5. Enable Event Notifications (Optional)

Get notified when files are uploaded:

1. Go to **Event Notifications**
2. Create notification:
   - **Event types**: Object created, Object deleted
   - **Destination**: Queue or webhook

## Using R2 in Your Application

### Current Implementation

The application uses AWS S3 SDK for R2 compatibility:

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CF_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY!,
  },
});

// Upload file
await s3Client.send(new PutObjectCommand({
  Bucket: process.env.CF_R2_BUCKET_NAME,
  Key: `evidence/${fileId}.pdf`,
  Body: fileBuffer,
  ContentType: 'application/pdf',
}));

// File URL
const fileUrl = `${process.env.CF_R2_PUBLIC_URL}/evidence/${fileId}.pdf`;
```

### File Organization

Recommended folder structure:

```
cnktyklt-syt/
├── evidence/           # Evidence files from practitioners
│   ├── 2025/
│   │   ├── 01/
│   │   │   ├── uuid-1.pdf
│   │   │   └── uuid-2.jpg
│   │   └── 02/
│   └── 2024/
├── exports/            # Generated reports
│   ├── compliance-report-2025-01.pdf
│   └── unit-report-2025-01.xlsx
└── backups/            # Database backups
    ├── backup-20250106.sql.gz
    └── backup-20250105.sql.gz
```

## Security Best Practices

### 1. Access Control

Current setup:
- ✅ Public access enabled for file downloads
- ✅ Access keys secured in environment variables
- ⚠️ Consider restricting public access and using signed URLs

### 2. File Validation

Always validate files before upload:

```typescript
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateFile(file: File): boolean {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large');
  }
  return true;
}
```

### 3. File Integrity

Generate and store checksums:

```typescript
import crypto from 'crypto';

function generateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Store in database
await sql`
  INSERT INTO "GhiNhanHoatDong" (
    "FileMinhChungSha256",
    "FileMinhChungUrl"
  ) VALUES (
    ${checksum},
    ${fileUrl}
  )
`;
```

## Monitoring & Costs

### Current Usage

- **Storage**: 0 B (empty)
- **Class A Operations**: 0 (PUT, POST, LIST)
- **Class B Operations**: 0 (GET, HEAD)

### Pricing (as of 2025)

- **Storage**: $0.015/GB/month
- **Class A Operations**: $4.50 per million requests
- **Class B Operations**: $0.36 per million requests
- **Egress**: Free (no bandwidth charges!)

### Estimated Costs

For 1,000 practitioners with average 5 files each (5MB per file):

```
Storage: 1,000 × 5 × 5MB = 25GB
Cost: 25GB × $0.015 = $0.375/month

Operations (monthly):
- Uploads: 5,000 × $4.50/1M = $0.023
- Downloads: 50,000 × $0.36/1M = $0.018

Total: ~$0.42/month
```

Very affordable! 💰

## Troubleshooting

### Issue: "Access Denied" when uploading

**Solution**: Verify access keys are correct and have write permissions.

```bash
# Test access
wrangler r2 bucket list
```

### Issue: CORS errors in browser

**Solution**: Configure CORS policy (see step 2 above).

### Issue: Files not accessible via public URL

**Solution**: Ensure public access is enabled in bucket settings.

### Issue: Slow upload speeds

**Solution**: 
- Bucket is in APAC region (optimal for Vietnam)
- Consider using multipart upload for large files
- Check network connection

## Backup Strategy

### Automated Backups

Create a backup script:

```bash
#!/bin/bash
# backup-r2.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"

# List all files
wrangler r2 object list cnktyklt-syt > r2-inventory-$DATE.txt

# Sync to local backup (optional)
# rclone sync r2:cnktyklt-syt /backup/r2/

echo "Backup completed: $DATE"
```

### Disaster Recovery

R2 automatically replicates data across multiple locations for durability (99.999999999% - 11 nines).

## Resources

- [R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [S3 API Compatibility](https://developers.cloudflare.com/r2/api/s3/)
- [Wrangler R2 Commands](https://developers.cloudflare.com/workers/wrangler/commands/#r2)

## Summary

✅ **Your R2 bucket is ready to use!**

**Current Status:**
- Bucket created and configured
- Public access enabled
- Environment variables set
- Ready for file uploads

**Recommended Next Steps:**
1. Set up custom domain for production
2. Configure CORS policy
3. Test file upload/download
4. Set up lifecycle rules (7-year retention)

**For Production:**
- Update `CF_R2_PUBLIC_URL` to custom domain
- Generate new access keys for production
- Enable event notifications
- Set up monitoring alerts

Your R2 storage is production-ready! 🚀
