#!/usr/bin/env tsx
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function verify() {
  try {
    console.log('Checking indexes on DanhMucHoatDong...\n');
    
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'DanhMucHoatDong'
      ORDER BY indexname
    `;
    
    console.log(`Total indexes: ${indexes.length}\n`);
    indexes.forEach(idx => {
      console.log(`✅ ${idx.indexname}`);
    });
    
    console.log('\nChecking foreign key constraints...\n');
    
    const constraints = await sql`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = '"DanhMucHoatDong"'::regclass
        AND contype = 'f'
      ORDER BY conname
    `;
    
    console.log(`Total FK constraints: ${constraints.length}\n`);
    constraints.forEach(con => {
      console.log(`✅ ${con.conname}`);
      console.log(`   ${con.definition}\n`);
    });
    
    console.log('Checking enum type...\n');
    
    const enumValues = await sql`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = 'activity_catalog_status'::regtype
      ORDER BY enumsortorder
    `;
    
    console.log('activity_catalog_status values:');
    enumValues.forEach(e => {
      console.log(`  - ${e.enumlabel}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verify();
