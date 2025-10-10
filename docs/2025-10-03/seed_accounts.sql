-- Seed script for CNKTYKLT – Creating 3 types of accounts
-- Run this after v_1_init_schema.sql
-- This creates sample accounts for testing: SoYTe, DonVi, and NguoiHanhNghe roles

BEGIN;

-- === Step 1: Create organizational units (DonVi) ===
-- Provincial Health Department (Sở Y Tế Cần Thơ)
INSERT INTO "DonVi" ("MaDonVi", "TenDonVi", "CapQuanLy", "MaDonViCha", "TrangThai")
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Sở Y Tế Cần Thơ', 'SoYTe', NULL, true)
ON CONFLICT ("MaDonVi") DO NOTHING;

-- Hospital under Provincial Health Department (Bệnh viện Đa khoa Cần Thơ)
INSERT INTO "DonVi" ("MaDonVi", "TenDonVi", "CapQuanLy", "MaDonViCha", "TrangThai")
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'Bệnh viện Đa khoa Cần Thơ', 'BenhVien', '00000000-0000-0000-0000-000000000001', true)
ON CONFLICT ("MaDonVi") DO NOTHING;

-- Medical Center (Trung tâm Y tế Ninh Kiều)
INSERT INTO "DonVi" ("MaDonVi", "TenDonVi", "CapQuanLy", "MaDonViCha", "TrangThai")
VALUES 
  ('00000000-0000-0000-0000-000000000003', 'Trung tâm Y tế Ninh Kiều', 'TrungTam', '00000000-0000-0000-0000-000000000001', true)
ON CONFLICT ("MaDonVi") DO NOTHING;


-- === Step 2: Create user accounts (TaiKhoan) ===
-- Password for all accounts: "password123" 
-- bcrypt hash: $2a$10$rQZ8VZ7vQZ8VZ7vQZ8VZ7uK.F8F8F8F8F8F8F8F8F8F8F8F8F8F8
-- (Note: In production, use actual bcrypt hash. This is a placeholder)

-- Account 1: Provincial Health Department Admin (SoYTe role)
INSERT INTO "TaiKhoan" ("MaTaiKhoan", "TenDangNhap", "MatKhauBam", "QuyenHan", "MaDonVi", "TrangThai")
VALUES 
  ('10000000-0000-0000-0000-000000000001', 
   'soyte_admin', 
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
   'SoYTe', 
   '00000000-0000-0000-0000-000000000001', 
   true)
ON CONFLICT ("TenDangNhap") DO NOTHING;

-- Account 2: Hospital Unit Manager (DonVi role)
INSERT INTO "TaiKhoan" ("MaTaiKhoan", "TenDangNhap", "MatKhauBam", "QuyenHan", "MaDonVi", "TrangThai")
VALUES 
  ('10000000-0000-0000-0000-000000000002', 
   'benhvien_qldt', 
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
   'DonVi', 
   '00000000-0000-0000-0000-000000000002', 
   true)
ON CONFLICT ("TenDangNhap") DO NOTHING;

-- Account 3: Medical Center Manager (DonVi role)
INSERT INTO "TaiKhoan" ("MaTaiKhoan", "TenDangNhap", "MatKhauBam", "QuyenHan", "MaDonVi", "TrangThai")
VALUES 
  ('10000000-0000-0000-0000-000000000003', 
   'ttyt_ninhkieu', 
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
   'DonVi', 
   '00000000-0000-0000-0000-000000000003', 
   true)
ON CONFLICT ("TenDangNhap") DO NOTHING;

-- Account 4: Healthcare Practitioner (NguoiHanhNghe role)
INSERT INTO "TaiKhoan" ("MaTaiKhoan", "TenDangNhap", "MatKhauBam", "QuyenHan", "MaDonVi", "TrangThai")
VALUES 
  ('10000000-0000-0000-0000-000000000004', 
   'bacsi_nguyen', 
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
   'NguoiHanhNghe', 
   '00000000-0000-0000-0000-000000000002', 
   true)
ON CONFLICT ("TenDangNhap") DO NOTHING;

-- Account 5: System Auditor (Auditor role)
INSERT INTO "TaiKhoan" ("MaTaiKhoan", "TenDangNhap", "MatKhauBam", "QuyenHan", "MaDonVi", "TrangThai")
VALUES 
  ('10000000-0000-0000-0000-000000000005', 
   'auditor_system', 
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
   'Auditor', 
   NULL, 
   true)
ON CONFLICT ("TenDangNhap") DO NOTHING;


-- === Step 3: Create practitioner records (NhanVien) for the healthcare worker ===
INSERT INTO "NhanVien" ("MaNhanVien", "HoVaTen", "SoCCHN", "NgayCapCCHN", "MaDonVi", "TrangThaiLamViec", "Email", "DienThoai", "ChucDanh")
VALUES 
  ('20000000-0000-0000-0000-000000000001',
   'Nguyễn Văn An',
   'CCHN-2023-001234',
   '2023-01-15',
   '00000000-0000-0000-0000-000000000002',
   'DangLamViec',
   'nguyen.van.an@bvdkct.vn',
   '0909123456',
   'Bác sĩ Nội khoa')
ON CONFLICT ("SoCCHN") DO NOTHING;

-- Additional practitioners for testing
INSERT INTO "NhanVien" ("MaNhanVien", "HoVaTen", "SoCCHN", "NgayCapCCHN", "MaDonVi", "TrangThaiLamViec", "Email", "DienThoai", "ChucDanh")
VALUES 
  ('20000000-0000-0000-0000-000000000002',
   'Trần Thị Bình',
   'CCHN-2023-001235',
   '2023-02-20',
   '00000000-0000-0000-0000-000000000003',
   'DangLamViec',
   'tran.thi.binh@ttytnk.vn',
   '0909234567',
   'Điều dưỡng trưởng')
ON CONFLICT ("SoCCHN") DO NOTHING;

COMMIT;

-- === Summary ===
-- Created accounts:
-- 1. soyte_admin (SoYTe) - Provincial Health Department Administrator
-- 2. benhvien_qldt (DonVi) - Hospital Training Manager
-- 3. ttyt_ninhkieu (DonVi) - Medical Center Manager
-- 4. bacsi_nguyen (NguoiHanhNghe) - Healthcare Practitioner
-- 5. auditor_system (Auditor) - System Auditor
--
-- All passwords: "password"
-- Practitioner records created for testing activity submissions
