#!/usr/bin/env tsx
/**
 * Production Seed Script
 * 
 * Seeds the production database with initial required data:
 * - Department of Health unit
 * - System administrator account
 * - Basic activity catalog
 * 
 * Usage: npx tsx scripts/seed-production.ts
 * 
 * WARNING: Only run this once on a fresh production database!
 */

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const sql = neon(process.env.DATABASE_URL!);

async function seedDepartmentOfHealth() {
  console.log('🏥 Creating Department of Health unit...');
  
  const maDonVi = uuidv4();
  
  await sql`
    INSERT INTO "DonVi" (
      "MaDonVi",
      "TenDonVi",
      "CapQuanLy",
      "DiaChi",
      "DienThoai",
      "Email",
      "TrangThai"
    ) VALUES (
      ${maDonVi},
      'Sở Y Tế',
      'SoYTe',
      'Địa chỉ Sở Y Tế',
      '0123456789',
      'soyte@health.gov.vn',
      true
    )
    ON CONFLICT DO NOTHING
  `;
  
  console.log('✅ Department of Health unit created');
  return maDonVi;
}

async function seedAdminAccount(maDonVi: string) {
  console.log('👤 Creating system administrator account...');
  
  // Generate secure password
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const maTaiKhoan = uuidv4();
  
  await sql`
    INSERT INTO "TaiKhoan" (
      "MaTaiKhoan",
      "TenDangNhap",
      "MatKhauBam",
      "QuyenHan",
      "MaDonVi",
      "TrangThai",
      "TaoLuc"
    ) VALUES (
      ${maTaiKhoan},
      'admin',
      ${hashedPassword},
      'SoYTe',
      ${maDonVi},
      true,
      NOW()
    )
    ON CONFLICT ("TenDangNhap") DO NOTHING
  `;
  
  console.log('✅ Admin account created');
  console.log(`   Username: admin`);
  console.log(`   Password: ${password}`);
  console.log('   ⚠️  IMPORTANT: Change this password immediately after first login!');
  
  return maTaiKhoan;
}

async function seedActivityCatalog() {
  console.log('📚 Creating basic activity catalog...');
  
  const activities = [
    {
      ten: 'Khóa học chuyên môn',
      loai: 'KhoaHoc',
      moTa: 'Tham gia khóa học chuyên môn y tế',
      donViTinh: 'gio',
      tyLeQuyDoi: 1.0,
      soTinChiToiDa: 40,
    },
    {
      ten: 'Hội thảo khoa học',
      loai: 'HoiThao',
      moTa: 'Tham dự hội thảo, hội nghị khoa học',
      donViTinh: 'gio',
      tyLeQuyDoi: 0.5,
      soTinChiToiDa: 20,
    },
    {
      ten: 'Nghiên cứu khoa học',
      loai: 'NghienCuu',
      moTa: 'Thực hiện đề tài nghiên cứu khoa học',
      donViTinh: 'tin_chi',
      tyLeQuyDoi: 1.0,
      soTinChiToiDa: 30,
    },
    {
      ten: 'Báo cáo khoa học',
      loai: 'BaoCao',
      moTa: 'Trình bày báo cáo tại hội nghị khoa học',
      donViTinh: 'gio',
      tyLeQuyDoi: 1.5,
      soTinChiToiDa: 15,
    },
  ];
  
  for (const activity of activities) {
    const maDanhMuc = uuidv4();
    
    await sql`
      INSERT INTO "DanhMucHoatDong" (
        "MaDanhMuc",
        "TenHoatDong",
        "LoaiHoatDong",
        "MoTa",
        "DonViTinh",
        "TyLeQuyDoi",
        "SoTinChiToiDa",
        "TrangThai"
      ) VALUES (
        ${maDanhMuc},
        ${activity.ten},
        ${activity.loai},
        ${activity.moTa},
        ${activity.donViTinh},
        ${activity.tyLeQuyDoi},
        ${activity.soTinChiToiDa},
        true
      )
      ON CONFLICT DO NOTHING
    `;
  }
  
  console.log(`✅ Created ${activities.length} activity types`);
}

async function seedCreditRules() {
  console.log('📋 Creating default credit rules...');
  
  const maQuyTac = uuidv4();
  
  const rules = {
    soTinChiYeuCau: 120,
    soNamChuKy: 5,
    quyTacChuyenDoi: {
      KhoaHoc: { tyLe: 1.0, toiDa: 40 },
      HoiThao: { tyLe: 0.5, toiDa: 20 },
      NghienCuu: { tyLe: 1.0, toiDa: 30 },
      BaoCao: { tyLe: 1.5, toiDa: 15 },
    },
    nguongCanhBao: {
      cao: 70,
      trungBinh: 90,
    },
  };
  
  await sql`
    INSERT INTO "QuyTacTinChi" (
      "MaQuyTac",
      "TenQuyTac",
      "MoTa",
      "QuyTac",
      "TrangThai",
      "NgayHieuLuc"
    ) VALUES (
      ${maQuyTac},
      'Quy tắc tín chỉ mặc định',
      'Quy tắc tính tín chỉ CNKTYKLT chuẩn',
      ${JSON.stringify(rules)},
      true,
      NOW()
    )
    ON CONFLICT DO NOTHING
  `;
  
  console.log('✅ Default credit rules created');
}

async function verifySeeding() {
  console.log('\n🔍 Verifying seeded data...');
  
  const units = await sql`SELECT COUNT(*) as count FROM "DonVi"`;
  console.log(`   Units: ${units[0].count}`);
  
  const accounts = await sql`SELECT COUNT(*) as count FROM "TaiKhoan"`;
  console.log(`   Accounts: ${accounts[0].count}`);
  
  const activities = await sql`SELECT COUNT(*) as count FROM "DanhMucHoatDong"`;
  console.log(`   Activity types: ${activities[0].count}`);
  
  const rules = await sql`SELECT COUNT(*) as count FROM "QuyTacTinChi"`;
  console.log(`   Credit rules: ${rules[0].count}`);
  
  console.log('\n✅ Verification complete');
}

async function main() {
  console.log('🌱 CNKTYKLT Production Seeding');
  console.log('=' + '='.repeat(79) + '\n');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  // Confirm production seeding
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  WARNING: You are about to seed the PRODUCTION database!');
    console.log('   This should only be done once on a fresh database.');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  try {
    const maDonVi = await seedDepartmentOfHealth();
    await seedAdminAccount(maDonVi);
    await seedActivityCatalog();
    await seedCreditRules();
    await verifySeeding();
    
    console.log('\n✅ Production seeding completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Login with admin account');
    console.log('   2. Change the default password');
    console.log('   3. Create additional healthcare units');
    console.log('   4. Configure unit administrators');
    console.log('   5. Import practitioner data');
    
  } catch (error: any) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
