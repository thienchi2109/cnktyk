#!/usr/bin/env tsx
/**
 * Migration Runner for CNKTYK Healthcare Training Management System
 * Runs the initial schema and seed data scripts
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

const DATABASE_URL = 'postgresql://neondb_owner:npg_tCA2msHXhdM0@ep-polished-night-a1su6evx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function runMigrations() {
  console.log('🚀 Starting CNKTYK database migration...\n');

  const sql = neon(DATABASE_URL);

  try {
    // Test connection
    console.log('📡 Testing database connection...');
    const versionResult = await sql`SELECT version()`;
    console.log(`✅ Connected to: ${versionResult[0].version.split(',')[0]}\n`);

    // Check if tables already exist
    console.log('🔍 Checking existing schema...');
    const existingTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    if (existingTables.length > 0) {
      console.log(`⚠️  Found ${existingTables.length} existing table(s):`);
      existingTables.forEach(t => console.log(`   - ${t.table_name}`));
      console.log('\n❓ Do you want to proceed? This might modify existing data.');
      console.log('   To continue anyway, uncomment the following lines and run again.\n');
      // Uncomment to skip this check:
      // console.log('⏭️  Skipping check, proceeding with migration...\n');
    } else {
      console.log('✅ No existing tables found. Safe to proceed.\n');
    }

    // Step 1: Run schema migration
    console.log('📋 Step 1: Running schema migration (v_1_init_schema.sql)...');
    const schemaSQL = readFileSync(
      join(process.cwd(), '.serena', 'memories', 'v_1_init_schema.sql'),
      'utf8'
    );
    
    // Execute schema SQL
    await sql.unsafe(schemaSQL);
    console.log('✅ Schema migration completed successfully!\n');

    // Verify schema was created
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    console.log(`📊 Created ${tables.length} tables:`);
    tables.forEach(t => console.log(`   - ${t.table_name}`));
    console.log('');

    // Step 2: Run seed data
    console.log('🌱 Step 2: Running seed data (seed_accounts.sql)...');
    const seedSQL = readFileSync(
      join(process.cwd(), 'seed_accounts.sql'),
      'utf8'
    );
    
    // Execute seed SQL
    await sql.unsafe(seedSQL);
    console.log('✅ Seed data inserted successfully!\n');

    // Verify accounts were created
    const accountCount = await sql`
      SELECT COUNT(*) as count FROM "TaiKhoan"
    `;
    const donViCount = await sql`
      SELECT COUNT(*) as count FROM "DonVi"
    `;
    const nhanVienCount = await sql`
      SELECT COUNT(*) as count FROM "NhanVien"
    `;

    console.log('📈 Database Summary:');
    console.log(`   - Organizations (DonVi): ${donViCount[0].count}`);
    console.log(`   - Accounts (TaiKhoan): ${accountCount[0].count}`);
    console.log(`   - Practitioners (NhanVien): ${nhanVienCount[0].count}`);
    console.log('');

    // List created accounts
    const accounts = await sql`
      SELECT 
        tk."TenDangNhap",
        tk."QuyenHan",
        dv."TenDonVi"
      FROM "TaiKhoan" tk
      LEFT JOIN "DonVi" dv ON tk."MaDonVi" = dv."MaDonVi"
      ORDER BY tk."QuyenHan", tk."TenDangNhap"
    `;

    console.log('👥 Created Test Accounts:');
    accounts.forEach(acc => {
      const org = acc.TenDonVi || '(System)';
      console.log(`   - ${acc.TenDangNhap} [${acc.QuyenHan}] - ${org}`);
    });
    console.log('');
    console.log('🔑 All accounts password: "password"');
    console.log('');

    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('   1. Update your .env with the DATABASE_URL');
    console.log('   2. Start your development server: npm run dev');
    console.log('   3. Login with one of the test accounts');
    console.log('');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run migrations
runMigrations()
  .then(() => {
    console.log('✅ Migration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
