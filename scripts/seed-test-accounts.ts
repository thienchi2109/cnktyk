import { db } from '../lib/db/client';
import * as bcrypt from 'bcryptjs';

async function seedTestAccounts() {
  console.log('🌱 Seeding test accounts...\n');

  try {
    // Hash password "password" with bcrypt
    const passwordHash = await bcrypt.hash('password', 10);
    console.log('✅ Generated password hash\n');

    // Step 1: Create organizational units
    console.log('1. Creating organizational units...');

    await db.query(`
      INSERT INTO "DonVi" ("MaDonVi", "TenDonVi", "CapQuanLy", "MaDonViCha", "TrangThai", "LoaiDonVi")
      VALUES 
        ('00000000-0000-0000-0000-000000000001', 'Sở Y Tế Cần Thơ', 'SoYTe', NULL, 'HoatDong', 'SoYTe'),
        ('00000000-0000-0000-0000-000000000002', 'Bệnh viện Đa khoa Cần Thơ', 'BenhVien', '00000000-0000-0000-0000-000000000001', 'HoatDong', 'BenhVien'),
        ('00000000-0000-0000-0000-000000000003', 'Trung tâm Y tế Ninh Kiều', 'TrungTam', '00000000-0000-0000-0000-000000000001', 'HoatDong', 'TrungTam')
      ON CONFLICT ("MaDonVi") DO NOTHING
    `);
    console.log('   ✅ Created 3 units\n');

    // Step 2: Create user accounts
    console.log('2. Creating user accounts...');

    await db.query(`
      INSERT INTO "TaiKhoan" ("MaTaiKhoan", "TenDangNhap", "MatKhauBam", "QuyenHan", "MaDonVi", "TrangThai")
      VALUES 
        ('10000000-0000-0000-0000-000000000001', 'soyte_admin', $1, 'SoYTe', '00000000-0000-0000-0000-000000000001', true),
        ('10000000-0000-0000-0000-000000000002', 'benhvien_qldt', $1, 'DonVi', '00000000-0000-0000-0000-000000000002', true),
        ('10000000-0000-0000-0000-000000000003', 'ttyt_ninhkieu', $1, 'DonVi', '00000000-0000-0000-0000-000000000003', true),
        ('10000000-0000-0000-0000-000000000004', 'bacsi_nguyen', $1, 'NguoiHanhNghe', '00000000-0000-0000-0000-000000000002', true),
        ('10000000-0000-0000-0000-000000000005', 'auditor_system', $1, 'Auditor', NULL, true)
      ON CONFLICT ("TenDangNhap") DO NOTHING
    `, [passwordHash]);
    console.log('   ✅ Created 5 accounts\n');

    // Step 3: Create practitioner records
    console.log('3. Creating practitioner records...');

    await db.query(`
      INSERT INTO "NhanVien" ("MaNhanVien", "HoVaTen", "SoCCHN", "NgayCapCCHN", "MaDonVi", "TrangThaiLamViec", "Email", "DienThoai", "ChucDanh")
      VALUES 
        ('20000000-0000-0000-0000-000000000001', 'Nguyễn Văn An', 'CCHN-2023-001234', '2023-01-15', '00000000-0000-0000-0000-000000000002', 'DangLamViec', 'nguyen.van.an@bvdkct.vn', '0909123456', 'Bác sĩ Nội khoa'),
        ('20000000-0000-0000-0000-000000000002', 'Trần Thị Bình', 'CCHN-2023-001235', '2023-02-20', '00000000-0000-0000-0000-000000000003', 'DangLamViec', 'tran.thi.binh@ttytnk.vn', '0909234567', 'Điều dưỡng trưởng')
      ON CONFLICT ("SoCCHN") DO NOTHING
    `);
    console.log('   ✅ Created 2 practitioners\n');

    // Verify accounts
    console.log('4. Verifying created accounts...');
    const accounts = await db.query(`
      SELECT "TenDangNhap", "QuyenHan", "MaDonVi" 
      FROM "TaiKhoan" 
      ORDER BY "TenDangNhap"
    `);

    console.log('\n📋 Created Accounts:');
    accounts.forEach((acc: any) => {
      console.log(`   - ${acc.TenDangNhap} (${acc.QuyenHan})`);
    });

    console.log('\n✅ Seed completed successfully!');
    console.log('\n🔑 Login credentials:');
    console.log('   Username: soyte_admin, benhvien_qldt, bacsi_nguyen, etc.');
    console.log('   Password: password');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

// Run the seed
seedTestAccounts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
