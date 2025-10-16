/**
 * Create Development Accounts
 * 
 * Creates 3 accounts (one for each role) with password: 1234
 * 
 * Usage:
 * npx tsx scripts/create-dev-accounts.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../src/lib/db/client';
import bcrypt from 'bcryptjs';

interface Account {
  username: string;
  password: string;
  role: 'SoYTe' | 'DonVi' | 'NguoiHanhNghe';
  unitId: string;
  description: string;
}

// Simple dev accounts - all with password: 1234
const DEV_ACCOUNTS: Account[] = [
  {
    username: 'admin',
    password: '1234',
    role: 'SoYTe',
    unitId: '00000000-0000-0000-0000-000000000001',
    description: 'Admin - Sở Y Tế'
  },
  {
    username: 'qldv',
    password: '1234',
    role: 'DonVi',
    unitId: '00000000-0000-0000-0000-000000000002',
    description: 'Quản lý đơn vị'
  },
  {
    username: 'nhanvien',
    password: '1234',
    role: 'NguoiHanhNghe',
    unitId: '00000000-0000-0000-0000-000000000002',
    description: 'Nhân viên y tế'
  }
];

async function createAccount(account: Account) {
  try {
    // Check if account already exists
    const existing = await db.queryOne(`
      SELECT "MaTaiKhoan", "TenDangNhap" FROM "TaiKhoan" WHERE "TenDangNhap" = $1
    `, [account.username]);
    
    if (existing) {
      // Update password for existing account
      const hashedPassword = await bcrypt.hash(account.password, 10);
      
      await db.query(`
        UPDATE "TaiKhoan"
        SET "MatKhauBam" = $1,
            "TrangThai" = true
        WHERE "TenDangNhap" = $2
      `, [hashedPassword, account.username]);
      
      console.log(`✅ Updated: ${account.username.padEnd(15)} (${account.role.padEnd(16)}) - ${account.description}`);
    } else {
      // Create new account
      const hashedPassword = await bcrypt.hash(account.password, 10);
      
      await db.insert('TaiKhoan', {
        TenDangNhap: account.username,
        MatKhauBam: hashedPassword,
        QuyenHan: account.role,
        TrangThai: true,
        MaDonVi: account.unitId
      });
      
      console.log(`✅ Created: ${account.username.padEnd(15)} (${account.role.padEnd(16)}) - ${account.description}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Failed: ${account.username}`, error);
    return false;
  }
}

async function verifyAccount(username: string, password: string) {
  const user = await db.queryOne(`
    SELECT * FROM "TaiKhoan" WHERE "TenDangNhap" = $1
  `, [username]);
  
  if (!user) return false;
  
  return await bcrypt.compare(password, user.MatKhauBam);
}

async function main() {
  console.log('\n🚀 Create Development Accounts\n');
  console.log('═'.repeat(70));
  console.log('\n📝 Creating 3 dev accounts with password: 1234\n');
  
  // Create accounts
  for (const account of DEV_ACCOUNTS) {
    await createAccount(account);
  }
  
  // Verify all accounts
  console.log('\n🔍 Verifying accounts...\n');
  
  let allValid = true;
  for (const account of DEV_ACCOUNTS) {
    const isValid = await verifyAccount(account.username, account.password);
    if (isValid) {
      console.log(`   ✅ ${account.username} - OK`);
    } else {
      console.log(`   ❌ ${account.username} - FAILED`);
      allValid = false;
    }
  }
  
  // Print credentials
  console.log('\n═'.repeat(70));
  console.log('\n📋 Login Credentials:\n');
  console.log('Role                 Username          Password      Description');
  console.log('─'.repeat(70));
  
  for (const account of DEV_ACCOUNTS) {
    console.log(
      account.role.padEnd(20) +
      ' ' + account.username.padEnd(16) +
      ' ' + account.password.padEnd(12) +
      ' ' + account.description
    );
  }
  
  console.log('\n═'.repeat(70));
  
  if (allValid) {
    console.log('\n✨ Success! All accounts ready.\n');
    console.log('🔑 Login at: http://localhost:3000');
    console.log('   Password for all accounts: 1234\n');
  } else {
    console.error('\n⚠️  Some accounts failed verification.\n');
  }
  
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
