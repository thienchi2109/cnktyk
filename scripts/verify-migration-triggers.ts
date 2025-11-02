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
    console.log('Checking triggers and functions...\n');
    
    const triggers = await sql`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'DanhMucHoatDong'
      ORDER BY trigger_name
    `;
    
    console.log(`Triggers: ${triggers.length}\n`);
    triggers.forEach(t => {
      console.log(`✅ ${t.trigger_name}`);
      console.log(`   Event: ${t.event_manipulation}`);
      console.log(`   Action: ${t.action_statement}\n`);
    });
    
    const functions = await sql`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_name LIKE '%dmhd%'
      ORDER BY routine_name
    `;
    
    console.log(`Functions: ${functions.length}\n`);
    functions.forEach(f => {
      console.log(`✅ ${f.routine_name} (${f.routine_type})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verify();
