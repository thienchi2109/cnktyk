#!/usr/bin/env tsx
/**
 * Migration 003: Extended Activity Fields for Bulk Import System
 * 
 * This script adds extended fields to the GhiNhanHoatDong table:
 * - NgayHoatDong: Activity date
 * - NgayDuyet: Approval date
 * - NguoiDuyet: Approver account ID
 * - GhiChuDuyet: Approval notes
 * 
 * Run: npx tsx scripts/run-migration-003.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../lib/db/client';

async function runMigration() {
  console.log('🚀 Starting Migration 003: Extended Activity Fields\n');

  try {
    // Read migration SQL
    const migrationPath = join(process.cwd(), 'docs', 'migrations', '003_add_activity_extended_fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Executing migration SQL...');
    await db.query(migrationSQL);
    console.log('✅ Migration SQL executed successfully\n');

    // Verify new columns
    console.log('🔍 Verifying new columns...');
    const columns = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'GhiNhanHoatDong'
      AND column_name IN (
        'HinhThucCapNhatKienThucYKhoa',
        'ChiTietVaiTro',
        'DonViToChuc',
        'NgayBatDau',
        'NgayKetThuc',
        'SoTiet',
        'SoGioTinChiQuyDoi',
        'BangChungSoGiayChungNhan'
      )
      ORDER BY column_name;
    `);

    if (columns.length === 8) {
      console.log('✅ All 8 new columns created successfully:');
      columns.forEach((col: any) => {
        console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('⚠️  Warning: Expected 8 columns, found', columns.length);
    }

    // Verify indexes
    console.log('\n🔍 Verifying indexes...');
    const indexes = await db.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'GhiNhanHoatDong'
      AND indexname LIKE 'idx_gnhd_%'
      ORDER BY indexname;
    `);

    console.log(`✅ Found ${indexes.length} indexes:`);
    indexes.forEach((idx: any) => {
      console.log(`   - ${idx.indexname}`);
    });

    // Verify constraints
    console.log('\n🔍 Verifying constraints...');
    const constraints = await db.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'GhiNhanHoatDong'::regclass
      AND conname LIKE 'chk_gnhd_%'
      ORDER BY conname;
    `);

    console.log(`✅ Found ${constraints.length} check constraints:`);
    constraints.forEach((con: any) => {
      console.log(`   - ${con.conname}`);
    });

    console.log('\n✅ Migration 003 completed successfully!\n');
    console.log('📋 Next steps:');
    console.log('   1. Update TypeScript schemas in lib/db/schemas.ts');
    console.log('   2. Create frontend types in src/types/activity.ts');
    console.log('   3. Create mapper utilities in src/lib/api/activity-mapper.ts');
    console.log('   4. Update API routes to include new fields');
    console.log('   5. Test bulk import with new schema\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check DATABASE_URL in .env.local');
    console.error('   2. Verify database connection');
    console.error('   3. Check if migration was already applied');
    console.error('   4. Review error message above for specific issues\n');
    process.exit(1);
  }
}

runMigration();
