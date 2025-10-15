-- Test SQL for Migration 003: Extended Activity Fields
-- This script inserts a test activity with all the new extended fields

INSERT INTO "GhiNhanHoatDong" (
  "MaNhanVien",
  "TenHoatDong",
  "SoGioTinChiQuyDoi",
  "NguoiNhap",
  "TrangThaiDuyet",
  "HinhThucCapNhatKienThucYKhoa",
  "ChiTietVaiTro",
  "DonViToChuc",
  "NgayBatDau",
  "NgayKetThuc",
  "SoTiet",
  "BangChungSoGiayChungNhan"
) VALUES (
  (SELECT "MaNhanVien" FROM "NhanVien" LIMIT 1),
  'Hội thảo Y học lâm sàng 2024',
  5.5,
  (SELECT "MaTaiKhoan" FROM "TaiKhoan" LIMIT 1),
  'ChoDuyet',
  'Hội thảo khoa học',
  'Báo cáo viên',
  'Bệnh viện Đa khoa Cần Thơ',
  '2024-03-15',
  '2024-03-17',
  12,
  'GCN-2024-001234'
);

-- Verify the insert
SELECT 
  "TenHoatDong",
  "HinhThucCapNhatKienThucYKhoa",
  "ChiTietVaiTro",
  "DonViToChuc",
  "NgayBatDau",
  "NgayKetThuc",
  "SoTiet",
  "SoGioTinChiQuyDoi",
  "BangChungSoGiayChungNhan",
  "TrangThaiDuyet"
FROM "GhiNhanHoatDong"
WHERE "TenHoatDong" LIKE '%Hội thảo%'
ORDER BY "CreatedAt" DESC
LIMIT 1;
