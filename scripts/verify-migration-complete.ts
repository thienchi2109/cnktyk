#!/usr/bin/env tsx
/**
 * Comprehensive Migration Verification using Neon Database
 * Simulates MCP-style table inspection
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function verifyMigration() {
  console.log('🔍 Comprehensive Migration Verification\n');
  console.log('=' .repeat(80));
  console.log('');

  try {
    // 1. Describe Table Structure (like MCP describe_table)
    console.log('📋 TABLE STRUCTURE: DanhMucHoatDong\n');
    
    const columns = await sql`
      SELECT 
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'DanhMucHoatDong'
      ORDER BY ordinal_position
    `;

    console.log(`Total Columns: ${columns.length}\n`);
    
    // Highlight new columns
    const newColumns = ['MaDonVi', 'NguoiTao', 'NguoiCapNhat', 'TaoLuc', 'CapNhatLuc', 'TrangThai', 'DaXoaMem'];
    
    columns.forEach((col, idx) => {
      const isNew = newColumns.includes(col.column_name);
      const marker = isNew ? '✨ NEW' : '     ';
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      
      console.log(`${marker} [${(idx + 1).toString().padStart(2)}] ${col.column_name.padEnd(20)} ${col.data_type.padEnd(15)} ${nullable}${defaultVal}`);
    });

    console.log('\n' + '='.repeat(80) + '\n');

    // 2. Table Constraints (Primary Key, Foreign Keys, Checks)
    console.log('🔐 TABLE CONSTRAINTS\n');

    const constraints = await sql`
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = '"DanhMucHoatDong"'::regclass
      ORDER BY 
        CASE contype
          WHEN 'p' THEN 1  -- Primary key
          WHEN 'f' THEN 2  -- Foreign key
          WHEN 'u' THEN 3  -- Unique
          WHEN 'c' THEN 4  -- Check
        END,
        conname
    `;

    const typeLabels: Record<string, string> = {
      'p': 'PRIMARY KEY',
      'f': 'FOREIGN KEY',
      'u': 'UNIQUE',
      'c': 'CHECK'
    };

    constraints.forEach(con => {
      const typeLabel = typeLabels[con.constraint_type] || con.constraint_type;
      console.log(`[${typeLabel}] ${con.constraint_name}`);
      console.log(`  ${con.definition}`);
      console.log('');
    });

    console.log('='.repeat(80) + '\n');

    // 3. Indexes
    console.log('📊 TABLE INDEXES\n');

    const indexes = await sql`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'DanhMucHoatDong'
      ORDER BY indexname
    `;

    indexes.forEach(idx => {
      const isNew = idx.indexname.includes('donvi') || 
                    idx.indexname.includes('nguoitao') || 
                    idx.indexname.includes('soft_delete') ||
                    idx.indexname.includes('trangthai') ||
                    idx.indexname.includes('unique_name_unit');
      const marker = isNew ? '✨' : '  ';
      console.log(`${marker} ${idx.indexname}`);
      console.log(`   ${idx.indexdef}`);
      console.log('');
    });

    console.log('='.repeat(80) + '\n');

    // 4. Triggers
    console.log('⚡ TABLE TRIGGERS\n');

    const triggers = await sql`
      SELECT 
        trigger_name,
        event_manipulation,
        action_timing,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_schema = 'public'
        AND event_object_table = 'DanhMucHoatDong'
      ORDER BY trigger_name
    `;

    if (triggers.length > 0) {
      triggers.forEach(trg => {
        console.log(`✨ ${trg.trigger_name}`);
        console.log(`   Timing: ${trg.action_timing} ${trg.event_manipulation}`);
        console.log(`   Action: ${trg.action_statement}`);
        console.log('');
      });
    } else {
      console.log('   No triggers found');
    }

    console.log('='.repeat(80) + '\n');

    // 5. Enum Type Values
    console.log('📝 ENUM TYPE: activity_catalog_status\n');

    const enumValues = await sql`
      SELECT enumlabel, enumsortorder
      FROM pg_enum
      WHERE enumtypid = 'activity_catalog_status'::regtype
      ORDER BY enumsortorder
    `;

    enumValues.forEach((ev, idx) => {
      console.log(`   ${idx + 1}. ${ev.enumlabel}`);
    });

    console.log('\n' + '='.repeat(80) + '\n');

    // 6. Sample Data Verification
    console.log('📦 SAMPLE DATA (First 5 Activities)\n');

    const sampleData = await sql`
      SELECT 
        "MaDanhMuc",
        "TenDanhMuc",
        "LoaiHoatDong",
        "MaDonVi",
        "TrangThai",
        "DaXoaMem",
        "TaoLuc",
        "CapNhatLuc"
      FROM "DanhMucHoatDong"
      ORDER BY "TaoLuc" DESC NULLS LAST
      LIMIT 5
    `;

    if (sampleData.length > 0) {
      sampleData.forEach((row, idx) => {
        const scope = row.MaDonVi ? `Unit: ${row.MaDonVi.substring(0, 8)}...` : 'Global (System-wide)';
        const deleted = row.DaXoaMem ? '🗑️ SOFT DELETED' : '';
        console.log(`[${idx + 1}] ${row.TenDanhMuc}`);
        console.log(`    Type: ${row.LoaiHoatDong} | Status: ${row.TrangThai} | Scope: ${scope} ${deleted}`);
        console.log(`    Created: ${row.TaoLuc || 'N/A'} | Updated: ${row.CapNhatLuc || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('   No activities found in database');
    }

    console.log('='.repeat(80) + '\n');

    // 7. Statistics
    console.log('📈 DATABASE STATISTICS\n');

    const stats = await sql`
      SELECT 
        COUNT(*) as total_activities,
        COUNT(*) FILTER (WHERE "MaDonVi" IS NULL AND "DaXoaMem" = false) as global_active,
        COUNT(*) FILTER (WHERE "MaDonVi" IS NOT NULL AND "DaXoaMem" = false) as unit_active,
        COUNT(*) FILTER (WHERE "DaXoaMem" = true) as soft_deleted,
        COUNT(*) FILTER (WHERE "TrangThai" = 'Active') as status_active,
        COUNT(*) FILTER (WHERE "TrangThai" = 'Draft') as status_draft,
        COUNT(*) FILTER (WHERE "TrangThai" = 'Archived') as status_archived,
        COUNT(*) FILTER (WHERE "NguoiTao" IS NOT NULL) as with_creator,
        COUNT(*) FILTER (WHERE "TaoLuc" IS NOT NULL) as with_timestamp
      FROM "DanhMucHoatDong"
    `;

    const st = stats[0];
    console.log(`   Total Activities:        ${st.total_activities}`);
    console.log(`   ├─ Global (Active):      ${st.global_active}`);
    console.log(`   ├─ Unit-Specific:        ${st.unit_active}`);
    console.log(`   └─ Soft Deleted:         ${st.soft_deleted}`);
    console.log('');
    console.log(`   Status Distribution:`);
    console.log(`   ├─ Active:               ${st.status_active}`);
    console.log(`   ├─ Draft:                ${st.status_draft}`);
    console.log(`   └─ Archived:             ${st.status_archived}`);
    console.log('');
    console.log(`   Data Quality:`);
    console.log(`   ├─ With Creator:         ${st.with_creator}/${st.total_activities}`);
    console.log(`   └─ With Timestamps:      ${st.with_timestamp}/${st.total_activities}`);

    console.log('\n' + '='.repeat(80) + '\n');

    // 8. Validation Checks
    console.log('✅ VALIDATION CHECKS\n');

    const checks = [
      {
        name: 'All 7 new columns exist',
        query: await sql`
          SELECT COUNT(*) as count
          FROM information_schema.columns
          WHERE table_name = 'DanhMucHoatDong'
            AND column_name IN ('MaDonVi', 'NguoiTao', 'NguoiCapNhat', 'TaoLuc', 'CapNhatLuc', 'TrangThai', 'DaXoaMem')
        `,
        expected: 7
      },
      {
        name: 'All 3 new FK constraints exist',
        query: await sql`
          SELECT COUNT(*) as count
          FROM pg_constraint
          WHERE conrelid = '"DanhMucHoatDong"'::regclass
            AND contype = 'f'
            AND conname IN ('fk_dmhd_donvi', 'fk_dmhd_nguoitao', 'fk_dmhd_nguoicapnhat')
        `,
        expected: 3
      },
      {
        name: 'Unique constraint on (MaDonVi, TenDanhMuc) exists',
        query: await sql`
          SELECT COUNT(*) as count
          FROM pg_indexes
          WHERE tablename = 'DanhMucHoatDong'
            AND indexname = 'idx_dmhd_unique_name_unit'
        `,
        expected: 1
      },
      {
        name: 'Trigger for CapNhatLuc exists',
        query: await sql`
          SELECT COUNT(*) as count
          FROM information_schema.triggers
          WHERE event_object_table = 'DanhMucHoatDong'
            AND trigger_name = 'trg_dmhd_update_capnhat_luc'
        `,
        expected: 1
      },
      {
        name: 'Enum type activity_catalog_status exists',
        query: await sql`
          SELECT COUNT(*) as count
          FROM pg_type
          WHERE typname = 'activity_catalog_status'
        `,
        expected: 1
      },
      {
        name: 'No NULL timestamps in TaoLuc column',
        query: await sql`
          SELECT COUNT(*) as count
          FROM "DanhMucHoatDong"
          WHERE "TaoLuc" IS NULL
        `,
        expected: 0
      },
      {
        name: 'No NULL values in DaXoaMem column',
        query: await sql`
          SELECT COUNT(*) as count
          FROM "DanhMucHoatDong"
          WHERE "DaXoaMem" IS NULL
        `,
        expected: 0
      }
    ];

    let passCount = 0;
    let failCount = 0;

    for (const check of checks) {
      const actual = Number(check.query[0].count);
      const passed = actual === check.expected;
      const status = passed ? '✅ PASS' : '❌ FAIL';
      
      if (passed) passCount++;
      else failCount++;

      console.log(`   ${status} ${check.name}`);
      if (!passed) {
        console.log(`        Expected: ${check.expected}, Got: ${actual}`);
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Summary
    console.log('🎯 VERIFICATION SUMMARY\n');
    console.log(`   Total Checks: ${checks.length}`);
    console.log(`   ✅ Passed: ${passCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log('');

    if (failCount === 0) {
      console.log('   🎉 Migration successfully applied! All checks passed.');
    } else {
      console.log(`   ⚠️  Migration verification failed. ${failCount} check(s) did not pass.`);
      process.exit(1);
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Verification failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    process.exit(1);
  }
}

verifyMigration()
  .then(() => {
    console.log('\n✅ Verification script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
