# Security Hardening Guide

## Overview

This guide covers security best practices and hardening steps for the CNKTYKLT production environment.

## 1. Authentication & Authorization

### Password Security

**Current Implementation:**
- bcryptjs with cost factor 10
- Minimum password length: 8 characters
- Password stored as hash only

**Recommendations:**
```typescript
// Enforce strong password policy
const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventUserInfo: true, // Don't allow username in password
};
```

### Session Management

**Current Configuration:**
```typescript
// JWT session with 8-hour expiration
session: {
  strategy: "jwt",
  maxAge: 8 * 60 * 60, // 8 hours
  updateAge: 60 * 60,  // Update every hour
}
```

**Hardening Steps:**
- [ ] Enable secure cookie flags
- [ ] Implement session rotation
- [ ] Add device fingerprinting
- [ ] Log all authentication events

```typescript
// Enhanced session configuration
cookies: {
  sessionToken: {
    name: `__Secure-next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true, // HTTPS only
    },
  },
}
```

### Multi-Factor Authentication (Future Enhancement)

```typescript
// MFA implementation outline
interface MFAConfig {
  enabled: boolean;
  methods: ['totp', 'sms', 'email'];
  requiredForRoles: ['SoYTe', 'Auditor'];
  gracePeriod: number; // Days before enforcement
}
```

## 2. API Security

### Rate Limiting

**Implementation:**
```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      },
    });
  }
  
  return NextResponse.next();
}
```

### Input Validation

**Zod Schema Example:**
```typescript
// Strict validation for all inputs
const activitySubmissionSchema = z.object({
  tenHoatDong: z.string()
    .min(1, 'Activity name required')
    .max(200, 'Activity name too long')
    .regex(/^[a-zA-Z0-9\s\u00C0-\u1EF9]+$/, 'Invalid characters'),
  soGio: z.number()
    .positive('Hours must be positive')
    .max(1000, 'Hours exceeds maximum'),
  vaiTro: z.string()
    .max(100, 'Role too long')
    .optional(),
  // Sanitize HTML/script tags
  ghiChu: z.string()
    .max(1000, 'Comment too long')
    .transform(val => val.replace(/<[^>]*>/g, ''))
    .optional(),
});
```

### SQL Injection Prevention

**Current Protection:**
- Using parameterized queries with Neon serverless driver
- No string concatenation in SQL queries

**Example:**
```typescript
// ✅ SAFE - Parameterized query
const result = await sql`
  SELECT * FROM "NhanVien" 
  WHERE "MaNhanVien" = ${id}
`;

// ❌ UNSAFE - Never do this
const result = await sql`
  SELECT * FROM "NhanVien" 
  WHERE "MaNhanVien" = '${id}'
`;
```

### XSS Prevention

**Content Security Policy:**
```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.neon.tech https://*.r2.cloudflarestorage.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];
```

## 3. Database Security

### Connection Security

**Configuration:**
```bash
# Always use SSL/TLS
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Use connection pooling
POSTGRES_URL="postgresql://user:pass@host-pooler/db?sslmode=require&pgbouncer=true"
```

### Access Control

**Row-Level Security (Application-Level):**
```typescript
// Enforce data isolation in queries
async function getPractitioners(session: Session) {
  const { quyenHan, maDonVi } = session.user;
  
  if (quyenHan === 'SoYTe') {
    // Full access
    return await sql`SELECT * FROM "NhanVien"`;
  } else if (quyenHan === 'DonVi') {
    // Unit-scoped access
    return await sql`
      SELECT * FROM "NhanVien" 
      WHERE "MaDonVi" = ${maDonVi}
    `;
  } else {
    // Self-only access
    return await sql`
      SELECT * FROM "NhanVien" 
      WHERE "MaNhanVien" = ${session.user.maNhanVien}
    `;
  }
}
```

### Audit Logging

**Comprehensive Logging:**
```typescript
// Log all data modifications
await AuditLogger.logCreate('NhanVien', id, data, userId, ip);
await AuditLogger.logUpdate('NhanVien', id, before, after, userId, ip);
await AuditLogger.logDelete('NhanVien', id, userId, ip);
await AuditLogger.logLogin(userId, ip, success);
await AuditLogger.logFileUpload(fileId, fileName, userId, ip);
```

### Backup & Recovery

**Automated Backups:**
```bash
#!/bin/bash
# Daily backup script
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql.gz"

# Dump database
pg_dump $DATABASE_URL | gzip > $BACKUP_FILE

# Upload to R2
wrangler r2 object put cnktyklt-backups/$BACKUP_FILE --file $BACKUP_FILE

# Encrypt backup (optional)
gpg --encrypt --recipient admin@cnktyklt.gov.vn $BACKUP_FILE

# Clean up old backups (keep 90 days)
find . -name "backup_*.sql.gz" -mtime +90 -delete
```

## 4. File Upload Security

### File Validation

**Current Implementation:**
```typescript
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateFile(file: File): boolean {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large');
  }
  
  // Check file extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
    throw new Error('Invalid file extension');
  }
  
  return true;
}
```

### Virus Scanning (Future Enhancement)

```typescript
// Integration with ClamAV or cloud service
async function scanFile(buffer: Buffer): Promise<boolean> {
  // Option 1: ClamAV
  const clam = await clamscan.init();
  const { isInfected } = await clam.scanBuffer(buffer);
  
  // Option 2: Cloud service (VirusTotal, etc.)
  const result = await virusTotalScan(buffer);
  
  return !isInfected;
}
```

### File Integrity

**SHA-256 Checksum:**
```typescript
import crypto from 'crypto';

function generateChecksum(buffer: Buffer): string {
  return crypto
    .createHash('sha256')
    .update(buffer)
    .digest('hex');
}

// Store checksum with file metadata
await sql`
  INSERT INTO "GhiNhanHoatDong" (
    "FileMinhChungSha256",
    ...
  ) VALUES (
    ${checksum},
    ...
  )
`;
```

## 5. Network Security

### HTTPS Enforcement

**Cloudflare Configuration:**
```yaml
SSL/TLS Mode: Full (strict)
Always Use HTTPS: Enabled
Automatic HTTPS Rewrites: Enabled
Minimum TLS Version: 1.2
TLS 1.3: Enabled
```

### Security Headers

**Comprehensive Headers:**
```typescript
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
];
```

### CORS Configuration

**Strict CORS Policy:**
```typescript
// Only allow specific origins
const allowedOrigins = [
  'https://cnktyklt.gov.vn',
  'https://www.cnktyklt.gov.vn',
];

export function corsMiddleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  if (origin && !allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
  }
  
  return NextResponse.next({
    headers: {
      'Access-Control-Allow-Origin': origin || allowedOrigins[0],
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
```

## 6. Cloudflare WAF Rules

### Recommended Rules

**1. SQL Injection Protection:**
```
(http.request.uri.query contains "union select") or
(http.request.uri.query contains "drop table") or
(http.request.uri.query contains "exec(") or
(http.request.body contains "union select")
```

**2. XSS Protection:**
```
(http.request.uri.query contains "<script") or
(http.request.uri.query contains "javascript:") or
(http.request.body contains "<script")
```

**3. Path Traversal Protection:**
```
(http.request.uri.path contains "../") or
(http.request.uri.path contains "..\\")
```

**4. Rate Limiting by Endpoint:**
```
# Login endpoint: 5 requests per minute
(http.request.uri.path eq "/api/auth/signin") and
(rate(1m) > 5)

# API endpoints: 100 requests per minute
(http.request.uri.path contains "/api/") and
(rate(1m) > 100)
```

## 7. Monitoring & Alerting

### Security Monitoring

**Key Metrics to Monitor:**
- Failed login attempts
- Unusual API access patterns
- Large file uploads
- Database query errors
- Rate limit violations
- Suspicious IP addresses

**Alert Configuration:**
```yaml
alerts:
  - name: Multiple Failed Logins
    condition: failed_logins > 5 in 5 minutes
    action: block_ip, notify_admin
    
  - name: Unusual Data Access
    condition: records_accessed > 1000 in 1 minute
    action: notify_admin, log_details
    
  - name: Large File Upload
    condition: file_size > 10MB
    action: reject, log_attempt
    
  - name: SQL Injection Attempt
    condition: waf_rule_triggered = "sql_injection"
    action: block_request, notify_security_team
```

### Log Analysis

**Centralized Logging:**
```typescript
// Structured logging
logger.security({
  event: 'authentication_failure',
  userId: userId,
  ip: clientIp,
  userAgent: request.headers.get('user-agent'),
  timestamp: new Date().toISOString(),
  reason: 'invalid_credentials',
});
```

## 8. Incident Response

### Response Plan

**1. Detection:**
- Automated alerts trigger
- Manual security review
- User reports

**2. Assessment:**
- Determine severity (Critical/High/Medium/Low)
- Identify affected systems
- Estimate impact

**3. Containment:**
- Block malicious IPs
- Disable compromised accounts
- Isolate affected systems

**4. Eradication:**
- Remove malicious code
- Patch vulnerabilities
- Update security rules

**5. Recovery:**
- Restore from backups if needed
- Verify system integrity
- Resume normal operations

**6. Post-Incident:**
- Document incident
- Update security procedures
- Conduct lessons learned review

### Emergency Contacts

**Security Team:**
- Security Lead: [Name] - [Email] - [Phone]
- System Admin: [Name] - [Email] - [Phone]
- Database Admin: [Name] - [Email] - [Phone]

**External Resources:**
- Cloudflare Support: https://dash.cloudflare.com/support
- Neon Support: https://neon.tech/docs/introduction/support
- CERT/CC: https://www.cert.org

## 9. Compliance & Auditing

### Data Protection

**GDPR/Privacy Compliance:**
- [ ] Data minimization implemented
- [ ] User consent mechanisms
- [ ] Right to access (data export)
- [ ] Right to deletion (account removal)
- [ ] Data retention policies
- [ ] Privacy policy published

### Audit Requirements

**Regular Audits:**
- [ ] Quarterly security review
- [ ] Annual penetration testing
- [ ] Code security audit
- [ ] Access control review
- [ ] Backup verification
- [ ] Incident response drill

## 10. Security Checklist

### Daily
- [ ] Review security alerts
- [ ] Check failed login attempts
- [ ] Monitor error logs

### Weekly
- [ ] Review audit logs
- [ ] Check backup integrity
- [ ] Update security rules (if needed)

### Monthly
- [ ] Security patch updates
- [ ] Access control review
- [ ] Performance security review

### Quarterly
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Disaster recovery drill
- [ ] Security training

### Annually
- [ ] Comprehensive security assessment
- [ ] Third-party security audit
- [ ] Update security policies
- [ ] Review and update incident response plan

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Cloudflare Security](https://developers.cloudflare.com/fundamentals/basic-tasks/protect-your-site/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Neon Security](https://neon.tech/docs/introduction/security)
