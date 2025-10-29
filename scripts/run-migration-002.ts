#!/usr/bin/env tsx
/**
 * Migration Script: Add Extended Fields to NhanVien Table
 * 
 * This script adds new columns to the NhanVien table to support
 * additional practitioner information from the bulk import system.
 * 
 * Usage: npx tsx scripts/run-migration-002.ts
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

const sql = neon(process.env.DATABASE_URL!);

async function runMigration() {
  console.log('🚀 Starting migration: Add extended fields to NhanVien table...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'docs', 'migrations', '002_add_nhanvien_extended_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    console.log('📝 Executing migration SQL...');
    await sql(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify the new columns
    console.log('🔍 Verifying new columns...');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'NhanVien'
      AND column_name IN (
        'MaNhanVienNoiBo',
        'NgaySinh',
        'GioiTinh',
        'KhoaPhong',
        'NoiCapCCHN',
        'PhamViChuyenMon'
      )
      ORDER BY column_name
    `;

    if (columns.length === 6) {
      console.log('✅ All 6 new columns verified:\n');
      columns.forEach((col: any) => {
        console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
    } else {
      console.warn(`⚠️  Expected 6 columns, found ${columns.length}`);
    }

    console.log('\n🎉 Migration 002 completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Update your TypeScript schemas (lib/db/schemas.ts) ✅ Already done');
    console.log('   2. Update API routes to handle new fields');
    console.log('   3. Update frontend forms to display/edit new fields');
    console.log('   4. Test the bulk import system with new schema');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check DATABASE_URL in .env.local');
    console.error('   2. Verify database connection');
    console.error('   3. Check if migration was already applied');
    console.error('   4. Review migration SQL for syntax errors');
    process.exit(1);
  }
}

// Run the migration
runMigration();
