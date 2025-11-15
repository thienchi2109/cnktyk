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
    console.log('Checking columns in DanhMucHoatDong...\n');
    
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'DanhMucHoatDong'
      ORDER BY ordinal_position
    `;
    
    console.log(`Total columns: ${columns.length}\n`);
    
    columns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check for specific new columns
    const newCols = ['MaDonVi', 'NguoiTao', 'NguoiCapNhat', 'TaoLuc', 'CapNhatLuc', 'TrangThai', 'DaXoaMem'];
    console.log('\nNew columns status:');
    newCols.forEach(colName => {
      const exists = columns.some(c => c.column_name === colName);
      console.log(`  ${exists ? '✅' : '❌'} ${colName}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verify();
