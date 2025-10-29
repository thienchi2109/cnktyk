# Audit Logging System Documentation

## Overview

The CNKTYKLT platform includes a comprehensive audit logging system that tracks all data modifications, user actions, and system events. This ensures compliance with healthcare regulations and provides a complete audit trail for security and accountability.

## Features

### 1. Automatic Audit Logging
- All CREATE, UPDATE, DELETE operations are logged
- User authentication events (login/logout)
- File upload/download operations
- Data export and import operations
- Approval and rejection workflows

### 2. Audit Log Viewing
- **Role-Based Access**: Only SoYTe and Auditor roles can view audit logs
- **Advanced Filtering**: Filter by user, action, table, date range, IP address
- **Search Functionality**: Full-text search across all audit fields
- **Pagination**: Efficient handling of large audit log datasets
- **Export to CSV**: Download audit logs for external analysis

### 3. Record History Tracking
- View complete history of changes for any record
- Before/after values for UPDATE operations
- Timestamp and user information for all changes
- Immutable audit trail

### 4. File Integrity Verification
- SHA-256 checksums for all uploaded files
- Verify file integrity at any time
- Detect tampering or corruption
- Audit trail of file operations

### 5. System Statistics
- System-wide audit metrics
- Action breakdown by type
- Table modification statistics
- Top active users
- Suspicious activity detection

## Architecture

### Components

```
lib/audit/
├── logger.ts          # Core audit logging functionality
├── repository.ts      # Audit log queries and analysis
├── utils.ts           # Helper functions
└── index.ts           # Module exports

src/app/api/audit/
├── logs/route.ts              # Get audit logs with filtering
├── record-history/route.ts    # Get record change history
├── statistics/route.ts        # System-wide statistics
├── user-activity/route.ts     # User activity summary
├── verify-file/route.ts       # File integrity verification
└── export/route.ts            # Export audit logs to CSV

src/components/audit/
└── audit-log-viewer.tsx       # UI component for viewing logs

src/app/audit/
└── page.tsx                   # Audit dashboard page
```

### Database Schema

The audit logs are stored in the `NhatKyHeThong` table:

```sql
CREATE TABLE "NhatKyHeThong" (
  "MaNhatKy"   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "MaTaiKhoan" UUID,                    -- User who performed the action
  "HanhDong"   TEXT,                    -- Action type (CREATE, UPDATE, etc.)
  "Bang"       TEXT,                    -- Table name
  "KhoaChinh"  TEXT,                    -- Primary key of affected record
  "NoiDung"    JSONB,                   -- Action details (before/after values)
  "ThoiGian"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "DiaChiIP"   TEXT,                    -- Client IP address
  CONSTRAINT fk_nk_taikhoan FOREIGN KEY ("MaTaiKhoan") 
    REFERENCES "TaiKhoan" ("MaTaiKhoan") 
    ON UPDATE CASCADE ON DELETE SET NULL
);
```

## Usage

### 1. Logging Actions in API Routes

```typescript
import { AuditLogger } from '@/lib/audit';
import { getClientIP } from '@/lib/audit/utils';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const ipAddress = getClientIP(request);
  
  // Create a record
  const newRecord = await db.insert('NhanVien', data);
  
  // Log the creation
  await AuditLogger.logCreate(
    'NhanVien',
    newRecord.MaNhanVien,
    newRecord,
    session?.user?.id,
    ipAddress
  );
  
  return NextResponse.json({ success: true, data: newRecord });
}
```

### 2. Logging Updates with Before/After Values

```typescript
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const ipAddress = getClientIP(request);
  
  // Get current record
  const before = await db.queryOne('SELECT * FROM "NhanVien" WHERE "MaNhanVien" = $1', [id]);
  
  // Update record
  const after = await db.update('NhanVien', updateData, { MaNhanVien: id });
  
  // Log the update with changes
  await AuditLogger.logUpdate(
    'NhanVien',
    id,
    before,
    after,
    session?.user?.id,
    ipAddress
  );
  
  return NextResponse.json({ success: true, data: after });
}
```

### 3. Logging Approval/Rejection

```typescript
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const ipAddress = getClientIP(request);
  const { comment } = await request.json();
  
  // Approve activity
  await db.update('GhiNhanHoatDong', 
    { TrangThaiDuyet: 'DaDuyet', ThoiGianDuyet: new Date() },
    { MaGhiNhan: activityId }
  );
  
  // Log the approval
  await AuditLogger.logApprove(
    activityId,
    comment,
    session?.user?.id,
    ipAddress
  );
  
  return NextResponse.json({ success: true });
}
```

### 4. Logging File Operations

```typescript
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const ipAddress = getClientIP(request);
  
  // Upload file to R2
  const uploadResult = await uploadToR2(file);
  
  // Log the file upload
  await AuditLogger.logFileOperation(
    'UPLOAD',
    file.name,
    file.size,
    uploadResult.checksum,
    session?.user?.id,
    ipAddress,
    activityId
  );
  
  return NextResponse.json({ success: true, data: uploadResult });
}
```

### 5. Logging Authentication Events

```typescript
// In NextAuth callbacks
async signIn({ user, account }) {
  const ipAddress = request?.headers?.get('x-forwarded-for');
  
  await AuditLogger.logAuth(
    'LOGIN',
    user.id,
    true,
    ipAddress,
    { provider: account?.provider }
  );
  
  return true;
}
```

## API Endpoints

### GET /api/audit/logs

Get audit logs with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `pageSize` (number): Records per page (default: 50)
- `userId` (UUID): Filter by user ID
- `action` (string): Filter by action type
- `tableName` (string): Filter by table name
- `recordId` (UUID): Filter by record ID
- `startDate` (ISO date): Filter by start date
- `endDate` (ISO date): Filter by end date
- `ipAddress` (string): Filter by IP address
- `searchTerm` (string): Search across all fields

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [...],
    "total": 1234,
    "page": 1,
    "pageSize": 50,
    "totalPages": 25
  }
}
```

### GET /api/audit/record-history

Get complete change history for a specific record.

**Query Parameters:**
- `tableName` (string, required): Table name
- `recordId` (UUID, required): Record ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "MaNhatKy": "...",
      "HanhDong": "CREATE",
      "ThoiGian": "2025-01-15T10:30:00Z",
      "TenDangNhap": "admin",
      "NoiDung": { "created": {...} }
    },
    ...
  ]
}
```

### GET /api/audit/statistics

Get system-wide audit statistics (SoYTe only).

**Query Parameters:**
- `startDate` (ISO date): Start date for statistics
- `endDate` (ISO date): End date for statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLogs": 50000,
    "actionBreakdown": {
      "CREATE": 15000,
      "UPDATE": 20000,
      "DELETE": 500,
      ...
    },
    "tableBreakdown": {...},
    "topUsers": [...],
    "suspiciousActivity": [...]
  }
}
```

### GET /api/audit/user-activity

Get activity summary for a specific user.

**Query Parameters:**
- `userId` (UUID, required): User ID
- `startDate` (ISO date): Start date
- `endDate` (ISO date): End date

**Response:**
```json
{
  "success": true,
  "data": {
    "totalActions": 1234,
    "actionBreakdown": {...},
    "recentActivity": [...]
  }
}
```

### GET /api/audit/verify-file

Verify file integrity using checksums.

**Query Parameters:**
- `recordId` (UUID, required): Activity record ID

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "currentChecksum": "abc123...",
    "originalChecksum": "abc123...",
    "uploadLog": {...}
  }
}
```

### GET /api/audit/export

Export audit logs to CSV file.

**Query Parameters:** Same as `/api/audit/logs`

**Response:** CSV file download

## Security Considerations

### 1. Access Control
- Only SoYTe and Auditor roles can view audit logs
- Users can only view their own activity (unless SoYTe/Auditor)
- All API endpoints enforce role-based authorization

### 2. Data Protection
- Sensitive fields (passwords, tokens) are automatically redacted
- IP addresses are logged for security tracking
- Audit logs are immutable (no UPDATE or DELETE operations)

### 3. Performance
- Pagination prevents loading large datasets
- Indexes on common query fields (user, time, action)
- Efficient JSONB queries for content filtering

### 4. Compliance
- Complete audit trail for all data modifications
- Timestamps in UTC for consistency
- File integrity verification with SHA-256 checksums
- Export functionality for external audits

## Best Practices

### 1. Always Log Critical Operations
```typescript
// ✅ Good: Log all data modifications
await AuditLogger.logCreate('NhanVien', id, data, userId, ip);

// ❌ Bad: Skip audit logging
await db.insert('NhanVien', data);
```

### 2. Include Meaningful Context
```typescript
// ✅ Good: Include relevant details
await AuditLogger.logApprove(activityId, comment, userId, ip);

// ❌ Bad: Minimal information
await AuditLogger.log({ hanhDong: 'APPROVE' });
```

### 3. Handle Errors Gracefully
```typescript
// ✅ Good: Audit logging doesn't break app flow
try {
  await AuditLogger.logCreate(...);
} catch (error) {
  console.error('Audit logging failed:', error);
  // Continue with main operation
}
```

### 4. Use Appropriate Action Types
```typescript
// ✅ Good: Use specific action types
await AuditLogger.logApprove(...);  // Not just UPDATE

// ❌ Bad: Generic action for specific operations
await AuditLogger.logUpdate(...);  // For approval
```

## Monitoring and Maintenance

### 1. Regular Review
- Review suspicious activity logs weekly
- Monitor failed login attempts
- Check for unusual patterns

### 2. Data Retention
- Default retention: 7 years (healthcare compliance)
- Archive old logs to cold storage
- Implement automated cleanup policies

### 3. Performance Monitoring
- Monitor audit log table size
- Optimize queries as needed
- Consider partitioning for large datasets

### 4. Backup and Recovery
- Include audit logs in regular backups
- Test restore procedures
- Maintain off-site copies

## Troubleshooting

### Issue: Audit logs not appearing
**Solution:** Check that AuditLogger is being called in API routes

### Issue: Slow audit log queries
**Solution:** Ensure proper indexes exist, use pagination

### Issue: Missing IP addresses
**Solution:** Check reverse proxy configuration (x-forwarded-for header)

### Issue: Large JSONB content
**Solution:** Sanitize data before logging, remove unnecessary fields

## Future Enhancements

1. **Real-time Alerts**: Notify admins of suspicious activity
2. **Advanced Analytics**: ML-based anomaly detection
3. **Audit Log Visualization**: Charts and graphs for trends
4. **Automated Reports**: Scheduled audit reports via email
5. **Integration**: Export to SIEM systems
6. **Retention Policies**: Automated archival and cleanup
