#!/usr/bin/env tsx

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

import { 
  taiKhoanRepo, 
  donViRepo, 
  nhanVienRepo,
  CreateTaiKhoan,
  CreateDonVi,
  CreateNhanVien,
  TaiKhoanSchema,
  DonViSchema,
  NhanVienSchema
} from '../lib/db';

async function testRepositories() {
  console.log('🧪 Testing database repositories and schemas...\n');

  try {
    // Test 1: Create a healthcare unit (DonVi)
    console.log('1. Testing DonVi (Healthcare Unit) operations...');
    
    const donViData: CreateDonVi = {
      TenDonVi: 'Test Hospital',
      CapQuanLy: 'BenhVien',
      MaDonViCha: null,
      TrangThai: true
    };

    const createdDonVi = await donViRepo.create(donViData);
    console.log('✅ Created healthcare unit:', createdDonVi.TenDonVi);
    
    // Validate with Zod schema
    const validatedDonVi = DonViSchema.parse(createdDonVi);
    console.log('✅ DonVi schema validation passed');

    // Test 2: Create a user account (TaiKhoan)
    console.log('\n2. Testing TaiKhoan (User Account) operations...');
    
    const taiKhoanData: CreateTaiKhoan = {
      TenDangNhap: 'testuser',
      MatKhau: 'password123',
      QuyenHan: 'DonVi',
      MaDonVi: createdDonVi.MaDonVi,
      TrangThai: true
    };

    const createdTaiKhoan = await taiKhoanRepo.create(taiKhoanData);
    console.log('✅ Created user account:', createdTaiKhoan.TenDangNhap);
    
    // Validate with Zod schema
    const validatedTaiKhoan = TaiKhoanSchema.parse(createdTaiKhoan);
    console.log('✅ TaiKhoan schema validation passed');

    // Test password verification
    const verifiedUser = await taiKhoanRepo.verifyPassword('testuser', 'password123');
    if (verifiedUser) {
      console.log('✅ Password verification successful');
    } else {
      console.log('❌ Password verification failed');
    }

    // Test 3: Create a practitioner (NhanVien)
    console.log('\n3. Testing NhanVien (Practitioner) operations...');
    
    const nhanVienData: CreateNhanVien = {
      HoVaTen: 'Dr. Test Practitioner',
      SoCCHN: 'CCHN123456',
      NgayCapCCHN: new Date('2020-01-01'),
      MaDonVi: createdDonVi.MaDonVi,
      TrangThaiLamViec: 'DangLamViec',
      Email: 'test@example.com',
      DienThoai: '0123456789',
      ChucDanh: 'Bac si'
    };

    const createdNhanVien = await nhanVienRepo.create(nhanVienData);
    console.log('✅ Created practitioner:', createdNhanVien.HoVaTen);
    
    // Validate with Zod schema
    const validatedNhanVien = NhanVienSchema.parse(createdNhanVien);
    console.log('✅ NhanVien schema validation passed');

    // Test 4: Test repository queries
    console.log('\n4. Testing repository query methods...');
    
    // Find by unit
    const unitPractitioners = await nhanVienRepo.findByUnit(createdDonVi.MaDonVi);
    console.log(`✅ Found ${unitPractitioners.length} practitioners in unit`);

    // Find by username
    const foundUser = await taiKhoanRepo.findByUsername('testuser');
    if (foundUser) {
      console.log('✅ Found user by username:', foundUser.TenDangNhap);
    }

    // Test compliance status
    const complianceStatus = await nhanVienRepo.getComplianceStatus(createdNhanVien.MaNhanVien);
    console.log('✅ Compliance status:', complianceStatus);

    // Test 5: Test schema validation with invalid data
    console.log('\n5. Testing schema validation with invalid data...');
    
    try {
      TaiKhoanSchema.parse({
        MaTaiKhoan: 'invalid-uuid',
        TenDangNhap: '',
        MatKhauBam: '',
        QuyenHan: 'InvalidRole',
        MaDonVi: null,
        TrangThai: true,
        TaoLuc: new Date()
      });
      console.log('❌ Schema validation should have failed');
    } catch (error) {
      console.log('✅ Schema validation correctly rejected invalid data');
    }

    // Cleanup: Delete test data
    console.log('\n6. Cleaning up test data...');
    
    await nhanVienRepo.delete(createdNhanVien.MaNhanVien);
    console.log('✅ Deleted test practitioner');
    
    await taiKhoanRepo.delete(createdTaiKhoan.MaTaiKhoan);
    console.log('✅ Deleted test user account');
    
    await donViRepo.delete(createdDonVi.MaDonVi);
    console.log('✅ Deleted test healthcare unit');

    console.log('\n🎉 Repository and schema tests completed successfully!');

  } catch (error) {
    console.error('❌ Repository test failed:', error);
    process.exit(1);
  }
}

// Run the test
testRepositories().catch(console.error);