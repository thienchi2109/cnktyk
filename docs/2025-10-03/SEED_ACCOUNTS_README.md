# Seed Accounts for CNKTYKLT System

## Overview
This document describes the test accounts created by `seed_accounts.sql` for the Healthcare Training Management System (CT-HTMS).

## Prerequisites
1. Database schema initialized (run `v_1_init_schema.sql` first)
2. Neon PostgreSQL database or compatible PostgreSQL instance
3. Database connection configured in your environment

## Running the Seed Script

### Option 1: Using Neon MCP (Recommended)
If you have Neon MCP configured, you can run the script directly.

### Option 2: Using psql
```bash
psql $DATABASE_URL -f seed_accounts.sql
```

### Option 3: Using Node.js script
Create a quick script to run it:
```javascript
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const sql = neon(process.env.DATABASE_URL);
const seedSQL = fs.readFileSync('seed_accounts.sql', 'utf8');

await sql(seedSQL);
```

## Created Accounts

### 1. **Provincial Health Department Admin** (SoYTe)
- **Username**: `soyte_admin`
- **Password**: `password`
- **Role**: `SoYTe` (Provincial level)
- **Organization**: Sở Y Tế Cần Thơ
- **Permissions**: 
  - View all units and practitioners
  - System-wide reporting
  - Approve training activities across all units
  - Manage organizational structure

### 2. **Hospital Training Manager** (DonVi)
- **Username**: `benhvien_qldt`
- **Password**: `password`
- **Role**: `DonVi` (Unit level)
- **Organization**: Bệnh viện Đa khoa Cần Thơ (Hospital)
- **Permissions**:
  - Manage practitioners in their unit
  - Review and approve training submissions
  - Generate unit-level reports
  - Cannot access other units' data

### 3. **Medical Center Manager** (DonVi)
- **Username**: `ttyt_ninhkieu`
- **Password**: `password`
- **Role**: `DonVi` (Unit level)
- **Organization**: Trung tâm Y tế Ninh Kiều (Medical Center)
- **Permissions**:
  - Same as Hospital Manager but for their center
  - Manage their unit's practitioners
  - Unit-specific reporting

### 4. **Healthcare Practitioner** (NguoiHanhNghe)
- **Username**: `bacsi_nguyen`
- **Password**: `password`
- **Role**: `NguoiHanhNghe` (Practitioner)
- **Organization**: Bệnh viện Đa khoa Cần Thơ
- **Associated Practitioner**: Nguyễn Văn An (CCHN-2023-001234)
- **Permissions**:
  - Submit training activities
  - View own training records
  - Track own credit progress
  - Upload evidence documents

### 5. **System Auditor** (Auditor)
- **Username**: `auditor_system`
- **Password**: `password`
- **Role**: `Auditor` (System-wide auditor)
- **Organization**: None (system-wide access)
- **Permissions**:
  - Read-only access to all data
  - View audit logs
  - Generate compliance reports
  - No modification rights

## Organizational Structure Created

```
Sở Y Tế Cần Thơ (Provincial Health Dept)
├── Bệnh viện Đa khoa Cần Thơ (General Hospital)
│   └── Practitioners: Nguyễn Văn An
└── Trung tâm Y tế Ninh Kiều (Medical Center)
    └── Practitioners: Trần Thị Bình
```

## Practitioner Records

### 1. Nguyễn Văn An
- **License Number**: CCHN-2023-001234
- **Issue Date**: 2023-01-15
- **Title**: Bác sĩ Nội khoa (Internal Medicine Doctor)
- **Unit**: Bệnh viện Đa khoa Cần Thơ
- **Status**: DangLamViec (Currently Working)
- **Email**: nguyen.van.an@bvdkct.vn
- **Phone**: 0909123456

### 2. Trần Thị Bình
- **License Number**: CCHN-2023-001235
- **Issue Date**: 2023-02-20
- **Title**: Điều dưỡng trưởng (Head Nurse)
- **Unit**: Trung tâm Y tế Ninh Kiều
- **Status**: DangLamViec (Currently Working)
- **Email**: tran.thi.binh@ttytnk.vn
- **Phone**: 0909234567

## Testing Workflows

### Scenario 1: Practitioner submits training activity
1. Login as `bacsi_nguyen`
2. Navigate to training submission form
3. Submit a training activity with evidence
4. Status: ChoDuyet (Pending Approval)

### Scenario 2: Unit manager approves activity
1. Login as `benhvien_qldt`
2. View pending activities for their unit
3. Review evidence and approve
4. Status changes to DaDuyet (Approved)

### Scenario 3: Provincial oversight
1. Login as `soyte_admin`
2. View all activities across all units
3. Generate system-wide reports
4. Monitor compliance

### Scenario 4: Audit trail
1. Login as `auditor_system`
2. View all audit logs
3. Generate compliance reports
4. No modification capabilities

## Security Notes

⚠️ **Important**: These are test accounts with a simple password. In production:
- Use strong, unique passwords
- Implement password policies
- Enable 2FA where possible
- Rotate credentials regularly
- Use proper bcrypt hashing with appropriate salt rounds

## Multi-Tenancy Enforcement

The system enforces tenant isolation through:
- `MaDonVi` foreign keys in all relevant tables
- Role-based access control via `QuyenHan` enum
- WHERE clause filtering based on user's unit
- RPC functions validate tenant access

### Access Rules:
- **SoYTe**: Can access all units (no `MaDonVi` filter)
- **DonVi**: Can only access their `MaDonVi` and child units
- **NguoiHanhNghe**: Can only access their own records
- **Auditor**: Read-only access to all data

## Next Steps

1. Run the seed script against your database
2. Test login with each account type
3. Verify role-based access control
4. Test multi-tenancy isolation
5. Create additional test data as needed

## Database IDs

All seed data uses predictable UUIDs for easy reference:
- Organizations: `00000000-0000-0000-0000-00000000000X`
- Accounts: `10000000-0000-0000-0000-00000000000X`
- Practitioners: `20000000-0000-0000-0000-00000000000X`

This makes it easy to reference and clean up test data.
