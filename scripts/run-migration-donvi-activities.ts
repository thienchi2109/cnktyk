#!/usr/bin/env tsx
/**
 * Migration Runner: Add DonVi Activities Access
 * Date: 2025-11-02
 * Change ID: add-donvi-activities-access
 * 
 * This script applies the migration to add unit scoping to DanhMucHoatDong table
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

// Get DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('   Please set DATABASE_URL in your environment or .env file');
  process.exit(1);
}

async function runMigration() {
  console.log('🚀 Starting migration: Add DonVi Activities Access\n');
  console.log('Change ID: add-donvi-activities-access');
  console.log('Date: 2025-11-02\n');

  const sql = neon(DATABASE_URL);

  try {
    // Test connection
    console.log('📡 Testing database connection...');
    const versionResult = await sql`SELECT version()`;
    console.log(`✅ Connected to: ${versionResult[0].version.split(',')[0]}\n`);

    // Check if DanhMucHoatDong table exists
    console.log('🔍 Checking if DanhMucHoatDong table exists...');
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'DanhMucHoatDong'
      ) as exists
    `;
    
    if (!tableExists[0].exists) {
      console.error('❌ DanhMucHoatDong table does not exist!');
      console.error('   Please run initial schema migration first.');
      process.exit(1);
    }
    console.log('✅ DanhMucHoatDong table exists\n');

    // Check if migration was already applied
    console.log('🔍 Checking if migration was already applied...');
    const columnExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'DanhMucHoatDong' 
        AND column_name = 'MaDonVi'
      ) as exists
    `;

    if (columnExists[0].exists) {
      console.log('⚠️  Migration appears to already be applied (MaDonVi column exists)');
      console.log('   Do you want to skip or re-apply? (script will exit now for safety)\n');
      process.exit(0);
    }
    console.log('✅ Migration not yet applied\n');

    // Get current activity count
    const beforeCount = await sql`
      SELECT COUNT(*) as count FROM "DanhMucHoatDong"
    `;
    console.log(`📊 Current activities count: ${beforeCount[0].count}\n`);

    // Read and execute migration
    console.log('📋 Reading migration file...');
    const migrationSQL = readFileSync(
      join(process.cwd(), 'migrations', '2025-11-02_add_donvi_scope_to_danh_muc_hoat_dong.sql'),
      'utf8'
    );
    
    console.log('🔄 Executing migration...\n');
    await sql.unsafe(migrationSQL);
    console.log('✅ Migration executed successfully!\n');

    // Verify new columns were created
    console.log('🔍 Verifying new columns...');
    const newColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'DanhMucHoatDong'
        AND column_name IN ('MaDonVi', 'NguoiTao', 'NguoiCapNhat', 'TaoLuc', 'CapNhatLuc', 'TrangThai', 'DaXoaMem')
      ORDER BY ordinal_position
    `;

    if (newColumns.length === 7) {
      console.log('✅ All 7 new columns created:');
      newColumns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      console.log('');
    } else {
      console.error(`❌ Expected 7 columns, found ${newColumns.length}`);
      process.exit(1);
    }

    // Verify indexes were created
    console.log('🔍 Verifying indexes...');
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'DanhMucHoatDong'
        AND indexname LIKE 'idx_dmhd_%'
      ORDER BY indexname
    `;
    console.log(`✅ Found ${indexes.length} activity indexes:`);
    indexes.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });
    console.log('');

    // Verify foreign key constraints
    console.log('🔍 Verifying foreign key constraints...');
    const constraints = await sql`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'DanhMucHoatDong'::regclass
        AND conname LIKE 'fk_dmhd_%'
      ORDER BY conname
    `;
    console.log(`✅ Found ${constraints.length} foreign key constraints:`);
    constraints.forEach(con => {
      console.log(`   - ${con.conname}`);
    });
    console.log('');

    // Verify data integrity
    console.log('🔍 Verifying data integrity...');
    const afterCount = await sql`
      SELECT COUNT(*) as count FROM "DanhMucHoatDong"
    `;
    
    if (beforeCount[0].count !== afterCount[0].count) {
      console.error(`❌ Activity count mismatch! Before: ${beforeCount[0].count}, After: ${afterCount[0].count}`);
      process.exit(1);
    }
    console.log(`✅ Activity count unchanged: ${afterCount[0].count}\n`);

    // Check activities breakdown
    const breakdown = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE "MaDonVi" IS NULL AND "DaXoaMem" = false) as global_count,
        COUNT(*) FILTER (WHERE "MaDonVi" IS NOT NULL AND "DaXoaMem" = false) as unit_count,
        COUNT(*) FILTER (WHERE "DaXoaMem" = true) as soft_deleted_count,
        COUNT(*) FILTER (WHERE "TrangThai" = 'Active') as active_count,
        COUNT(*) FILTER (WHERE "TrangThai" = 'Draft') as draft_count,
        COUNT(*) FILTER (WHERE "TrangThai" = 'Archived') as archived_count
      FROM "DanhMucHoatDong"
    `;

    console.log('📊 Activities breakdown after migration:');
    console.log(`   - Global activities: ${breakdown[0].global_count}`);
    console.log(`   - Unit-specific activities: ${breakdown[0].unit_count}`);
    console.log(`   - Soft-deleted activities: ${breakdown[0].soft_deleted_count}`);
    console.log(`   - Status: Active=${breakdown[0].active_count}, Draft=${breakdown[0].draft_count}, Archived=${breakdown[0].archived_count}`);
    console.log('');

    // Sample data
    console.log('📋 Sample migrated activities:');
    const samples = await sql`
      SELECT 
        "MaDanhMuc",
        "TenDanhMuc",
        "MaDonVi",
        "TrangThai",
        "DaXoaMem",
        "TaoLuc"
      FROM "DanhMucHoatDong"
      LIMIT 3
    `;
    samples.forEach(activity => {
      const scope = activity.MaDonVi ? 'Unit-specific' : 'Global';
      console.log(`   - ${activity.TenDanhMuc} (${scope}, ${activity.TrangThai})`);
    });
    console.log('');

    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('   1. Update repository layer with new methods');
    console.log('   2. Update API routes for DonVi access');
    console.log('   3. Update frontend components');
    console.log('   4. Run tests: npm run typecheck && npm run test');
    console.log('');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   - Check if DATABASE_URL is correctly set');
    console.log('   - Verify database connection');
    console.log('   - Check migration file syntax');
    console.log('   - Review PostgreSQL logs for detailed errors');
    console.log('');
    process.exit(1);
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('✅ Migration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
