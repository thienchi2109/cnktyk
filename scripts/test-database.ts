#!/usr/bin/env tsx

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

import { setupDatabase, getDatabaseStatus, db } from '../lib/db';

async function testDatabase() {
  console.log('🔍 Testing database connection and setup...\n');

  try {
    // Test basic connection
    console.log('1. Testing database connection...');
    const connectionTest = await db.testConnection();
    
    if (connectionTest) {
      console.log('✅ Database connection successful');
    } else {
      console.log('❌ Database connection failed');
      return;
    }

    // Get database info
    console.log('\n2. Getting database information...');
    const dbInfo = await db.getDatabaseInfo();
    console.log(`   Database: ${dbInfo.currentDatabase}`);
    console.log(`   User: ${dbInfo.currentUser}`);
    console.log(`   Server Time: ${dbInfo.serverTime}`);
    console.log(`   Version: ${dbInfo.version.split(' ')[0]}`);

    // Setup database (apply schema if needed)
    console.log('\n3. Setting up database schema...');
    const setupResult = await setupDatabase();
    
    if (setupResult.success) {
      console.log('✅ Database setup completed successfully');
      
      if (setupResult.details?.stats) {
        console.log('\n📊 Database Statistics:');
        console.log(`   Total Size: ${setupResult.details.stats.totalSize}`);
        console.log('   Tables:');
        setupResult.details.stats.tables.forEach((table: any) => {
          console.log(`     - ${table.name}: ${table.rowCount} rows (${table.size})`);
        });
      }
    } else {
      console.log('❌ Database setup failed:', setupResult.message);
      if (setupResult.details) {
        console.log('   Details:', setupResult.details);
      }
      return;
    }

    // Test a simple query
    console.log('\n4. Testing database queries...');
    const testQuery = await db.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = $1', ['public']);
    console.log(`✅ Found ${testQuery[0]?.table_count} tables in public schema`);

    // Test enum types
    console.log('\n5. Verifying enum types...');
    const enumTypes = await db.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typname IN ('cap_quan_ly', 'trang_thai_lam_viec', 'trang_thai_duyet', 'quyen_han', 'loai_hoat_dong', 'don_vi_tinh', 'trang_thai_tb')
      ORDER BY typname
    `);
    console.log(`✅ Found ${enumTypes.length} enum types:`, enumTypes.map(t => t.typname).join(', '));

    // Test extensions
    console.log('\n6. Verifying extensions...');
    const extensions = await db.query('SELECT extname FROM pg_extension WHERE extname = $1', ['pgcrypto']);
    if (extensions.length > 0) {
      console.log('✅ pgcrypto extension is installed');
    } else {
      console.log('⚠️  pgcrypto extension not found');
    }

    console.log('\n🎉 Database test completed successfully!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDatabase().catch(console.error);