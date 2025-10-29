#!/usr/bin/env tsx
/**
 * Production Verification Script
 * 
 * This script verifies that the production environment is properly configured
 * and all critical systems are operational.
 * 
 * Usage: npx tsx scripts/verify-production.ts
 */

import { neon } from '@neondatabase/serverless';

interface VerificationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

function addResult(check: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any) {
  results.push({ check, status, message, details });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${check}: ${message}`);
  if (details) {
    console.log(`   Details:`, details);
  }
}

async function verifyEnvironmentVariables() {
  console.log('\n🔍 Checking Environment Variables...\n');
  
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'CF_R2_ACCESS_KEY_ID',
    'CF_R2_SECRET_ACCESS_KEY',
    'CF_R2_BUCKET_NAME',
  ];
  
  for (const varName of required) {
    if (process.env[varName]) {
      addResult(`ENV: ${varName}`, 'PASS', 'Set');
    } else {
      addResult(`ENV: ${varName}`, 'FAIL', 'Missing or empty');
    }
  }
  
  // Check NEXTAUTH_URL format
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl) {
    if (nextAuthUrl.startsWith('https://')) {
      addResult('ENV: NEXTAUTH_URL Protocol', 'PASS', 'Using HTTPS');
    } else if (nextAuthUrl.startsWith('http://localhost')) {
      addResult('ENV: NEXTAUTH_URL Protocol', 'WARN', 'Using localhost (development mode)');
    } else {
      addResult('ENV: NEXTAUTH_URL Protocol', 'FAIL', 'Should use HTTPS in production');
    }
  }
  
  // Check secret strength
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) {
    if (secret.length >= 32) {
      addResult('ENV: NEXTAUTH_SECRET Strength', 'PASS', `Strong (${secret.length} chars)`);
    } else {
      addResult('ENV: NEXTAUTH_SECRET Strength', 'WARN', `Weak (${secret.length} chars, recommend 32+)`);
    }
  }
}

async function verifyDatabaseConnection() {
  console.log('\n🔍 Checking Database Connection...\n');
  
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    // Test connection
    const startTime = Date.now();
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    const latency = Date.now() - startTime;
    
    addResult('Database: Connection', 'PASS', `Connected (${latency}ms)`, {
      timestamp: result[0].current_time,
      version: result[0].pg_version,
    });
    
    // Check latency
    if (latency < 100) {
      addResult('Database: Latency', 'PASS', `Excellent (${latency}ms)`);
    } else if (latency < 300) {
      addResult('Database: Latency', 'WARN', `Acceptable (${latency}ms)`);
    } else {
      addResult('Database: Latency', 'WARN', `High (${latency}ms) - consider optimization`);
    }
    
  } catch (error: any) {
    addResult('Database: Connection', 'FAIL', error.message);
    return;
  }
}

async function verifyDatabaseSchema() {
  console.log('\n🔍 Checking Database Schema...\n');
  
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    // Check required tables
    const requiredTables = [
      'TaiKhoan',
      'NhanVien',
      'DonVi',
      'GhiNhanHoatDong',
      'DanhMucHoatDong',
      'KyCNKT',
      'ThongBao',
      'NhatKyHeThong',
      'QuyTacTinChi',
    ];
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;
    
    const tableNames = tables.map((t: any) => t.table_name);
    
    for (const tableName of requiredTables) {
      if (tableNames.includes(tableName)) {
        addResult(`Schema: Table ${tableName}`, 'PASS', 'Exists');
      } else {
        addResult(`Schema: Table ${tableName}`, 'FAIL', 'Missing');
      }
    }
    
    // Check for indexes
    const indexes = await sql`
      SELECT 
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `;
    
    addResult('Schema: Indexes', 'PASS', `Found ${indexes.length} indexes`);
    
  } catch (error: any) {
    addResult('Schema: Verification', 'FAIL', error.message);
  }
}

async function verifyDatabaseData() {
  console.log('\n🔍 Checking Database Data...\n');
  
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    // Check for admin account
    const accounts = await sql`SELECT COUNT(*) as count FROM "TaiKhoan"`;
    const accountCount = Number(accounts[0].count);
    
    if (accountCount > 0) {
      addResult('Data: User Accounts', 'PASS', `${accountCount} accounts found`);
    } else {
      addResult('Data: User Accounts', 'WARN', 'No accounts found - seed data may be needed');
    }
    
    // Check for units
    const units = await sql`SELECT COUNT(*) as count FROM "DonVi"`;
    const unitCount = Number(units[0].count);
    
    if (unitCount > 0) {
      addResult('Data: Healthcare Units', 'PASS', `${unitCount} units found`);
    } else {
      addResult('Data: Healthcare Units', 'WARN', 'No units found - seed data may be needed');
    }
    
    // Check for activity catalog
    const activities = await sql`SELECT COUNT(*) as count FROM "DanhMucHoatDong"`;
    const activityCount = Number(activities[0].count);
    
    if (activityCount > 0) {
      addResult('Data: Activity Catalog', 'PASS', `${activityCount} activity types found`);
    } else {
      addResult('Data: Activity Catalog', 'WARN', 'No activity types found - configuration needed');
    }
    
  } catch (error: any) {
    addResult('Data: Verification', 'FAIL', error.message);
  }
}

async function verifyR2Configuration() {
  console.log('\n🔍 Checking R2 Storage Configuration...\n');
  
  const r2Config = {
    accountId: process.env.CF_R2_ACCOUNT_ID,
    accessKeyId: process.env.CF_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY,
    bucketName: process.env.CF_R2_BUCKET_NAME,
    endpoint: process.env.CF_R2_ENDPOINT,
    publicUrl: process.env.CF_R2_PUBLIC_URL,
  };
  
  let allConfigured = true;
  
  for (const [key, value] of Object.entries(r2Config)) {
    if (value) {
      addResult(`R2: ${key}`, 'PASS', 'Configured');
    } else {
      addResult(`R2: ${key}`, 'FAIL', 'Not configured');
      allConfigured = false;
    }
  }
  
  if (allConfigured) {
    // Try to test R2 connection (basic check)
    try {
      const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3');
      
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: r2Config.endpoint,
        credentials: {
          accessKeyId: r2Config.accessKeyId!,
          secretAccessKey: r2Config.secretAccessKey!,
        },
      });
      
      await s3Client.send(new HeadBucketCommand({ Bucket: r2Config.bucketName }));
      addResult('R2: Bucket Access', 'PASS', 'Bucket accessible');
      
    } catch (error: any) {
      if (error.name === 'NotFound') {
        addResult('R2: Bucket Access', 'FAIL', 'Bucket not found');
      } else if (error.name === 'Forbidden') {
        addResult('R2: Bucket Access', 'FAIL', 'Access denied - check credentials');
      } else {
        addResult('R2: Bucket Access', 'WARN', `Could not verify: ${error.message}`);
      }
    }
  }
}

async function verifySecurityConfiguration() {
  console.log('\n🔍 Checking Security Configuration...\n');
  
  // Check NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    addResult('Security: NODE_ENV', 'PASS', 'Set to production');
  } else {
    addResult('Security: NODE_ENV', 'WARN', `Set to ${nodeEnv || 'undefined'}`);
  }
  
  // Check HTTPS
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl?.startsWith('https://')) {
    addResult('Security: HTTPS', 'PASS', 'Enabled');
  } else if (nextAuthUrl?.startsWith('http://localhost')) {
    addResult('Security: HTTPS', 'WARN', 'Disabled (development mode)');
  } else {
    addResult('Security: HTTPS', 'FAIL', 'Not using HTTPS');
  }
  
  // Check secret randomness (basic check)
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) {
    const hasUpperCase = /[A-Z]/.test(secret);
    const hasLowerCase = /[a-z]/.test(secret);
    const hasNumbers = /[0-9]/.test(secret);
    const hasSpecial = /[^A-Za-z0-9]/.test(secret);
    
    const complexity = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecial].filter(Boolean).length;
    
    if (complexity >= 3) {
      addResult('Security: Secret Complexity', 'PASS', 'Good complexity');
    } else {
      addResult('Security: Secret Complexity', 'WARN', 'Low complexity - consider regenerating');
    }
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PRODUCTION VERIFICATION REPORT');
  console.log('='.repeat(80) + '\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  const total = results.length;
  
  console.log(`Total Checks: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log();
  
  if (failed > 0) {
    console.log('❌ PRODUCTION VERIFICATION FAILED');
    console.log('\nFailed checks:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => console.log(`  - ${r.check}: ${r.message}`));
    console.log('\n⚠️  Please fix the failed checks before deploying to production.');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  PRODUCTION VERIFICATION PASSED WITH WARNINGS');
    console.log('\nWarnings:');
    results
      .filter(r => r.status === 'WARN')
      .forEach(r => console.log(`  - ${r.check}: ${r.message}`));
    console.log('\n✅ System is functional but consider addressing warnings.');
    process.exit(0);
  } else {
    console.log('✅ ALL CHECKS PASSED - PRODUCTION READY!');
    process.exit(0);
  }
}

async function main() {
  console.log('🚀 CNKTYKLT Production Verification');
  console.log('=' + '='.repeat(79));
  
  try {
    await verifyEnvironmentVariables();
    await verifyDatabaseConnection();
    await verifyDatabaseSchema();
    await verifyDatabaseData();
    await verifyR2Configuration();
    await verifySecurityConfiguration();
    await generateReport();
  } catch (error: any) {
    console.error('\n❌ Verification failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
