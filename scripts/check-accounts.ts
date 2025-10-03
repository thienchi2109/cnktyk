import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

import { db } from '../lib/db/client';
import { authenticateUser } from '../lib/db/utils';

async function checkAccounts() {
  console.log('🔍 Checking database accounts...\n');

  try {
    // Check all accounts
    const accounts = await db.query(`
      SELECT "TenDangNhap", "QuyenHan", "TrangThai", "MaDonVi" 
      FROM "TaiKhoan" 
      ORDER BY "TenDangNhap"
    `);

    console.log(`Found ${accounts.length} accounts:\n`);
    accounts.forEach((acc: any) => {
      console.log(`  - ${acc.TenDangNhap} (${acc.QuyenHan}) - Status: ${acc.TrangThai ? 'Active' : 'Inactive'}`);
    });

    // Test authentication for bacsi_nguyen
    console.log('\n🔐 Testing authentication for bacsi_nguyen...');
    const authResult = await authenticateUser('bacsi_nguyen', 'password');
    
    if (authResult.success) {
      console.log('✅ Authentication successful!');
      console.log('   User:', JSON.stringify(authResult.user, null, 2));
    } else {
      console.log('❌ Authentication failed:', authResult.message);
      
      // Check if account exists
      const account = await db.query(`
        SELECT "TenDangNhap", "MatKhauBam", "TrangThai" 
        FROM "TaiKhoan" 
        WHERE "TenDangNhap" = $1
      `, ['bacsi_nguyen']);
      
      if (account.length > 0) {
        console.log('\n   Account exists in database:');
        console.log('   - Username:', account[0].TenDangNhap);
        console.log('   - Status:', account[0].TrangThai);
        console.log('   - Password hash:', account[0].MatKhauBam.substring(0, 20) + '...');
      } else {
        console.log('\n   ❌ Account does not exist in database!');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkAccounts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
