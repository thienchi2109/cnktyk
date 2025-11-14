-- Migration: Add Backup Tracking Table
-- Description: Track evidence file backups and deletions performed by SoYTe admins
-- Date: 2025-10-31
-- Related Change: add-evidence-backup-and-cleanup

-- Create backup tracking table
CREATE TABLE IF NOT EXISTS "SaoLuuMinhChung" (
    "MaSaoLuu" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "NgayBatDau" TIMESTAMP NOT NULL,
    "NgayKetThuc" TIMESTAMP NOT NULL,
    "TongSoTep" INTEGER NOT NULL DEFAULT 0,
    "DungLuong" BIGINT NULL, -- Size in bytes
    "TrangThai" VARCHAR(50) NOT NULL DEFAULT 'HoanThanh', -- HoanThanh, ThanhCong, ThatBai
    "MaTaiKhoan" UUID NOT NULL REFERENCES "TaiKhoan"("MaTaiKhoan") ON DELETE CASCADE,
    "NgayTao" TIMESTAMP NOT NULL DEFAULT NOW(),
    "GhiChu" TEXT NULL,
    CONSTRAINT "chk_ngay_sao_luu" CHECK ("NgayKetThuc" >= "NgayBatDau")
);

-- Create backup file tracking table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS "ChiTietSaoLuu" (
    "MaChiTiet" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "MaSaoLuu" UUID NOT NULL REFERENCES "SaoLuuMinhChung"("MaSaoLuu") ON DELETE CASCADE,
    "MaGhiNhan" UUID NOT NULL REFERENCES "GhiNhanHoatDong"("MaGhiNhan") ON DELETE CASCADE,
    "TrangThai" VARCHAR(50) NOT NULL DEFAULT 'DaSaoLuu', -- DaSaoLuu, DaXoa, ThanhCong, ThatBai
    "NgayXoa" TIMESTAMP NULL,
    "DungLuongTep" BIGINT NULL, -- Size in bytes
    CONSTRAINT "uq_saoluu_ghinhan" UNIQUE ("MaSaoLuu", "MaGhiNhan")
);

-- Create file deletion tracking table
CREATE TABLE IF NOT EXISTS "XoaMinhChung" (
    "MaXoa" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "MaSaoLuu" UUID NULL REFERENCES "SaoLuuMinhChung"("MaSaoLuu") ON DELETE SET NULL,
    "NgayBatDau" TIMESTAMP NOT NULL,
    "NgayKetThuc" TIMESTAMP NOT NULL,
    "TongSoTep" INTEGER NOT NULL DEFAULT 0,
    "SoTepThanhCong" INTEGER NOT NULL DEFAULT 0,
    "SoTepThatBai" INTEGER NOT NULL DEFAULT 0,
    "DungLuongGiaiPhong" BIGINT NULL, -- Size freed in bytes
    "MaTaiKhoan" UUID NOT NULL REFERENCES "TaiKhoan"("MaTaiKhoan") ON DELETE CASCADE,
    "NgayThucHien" TIMESTAMP NOT NULL DEFAULT NOW(),
    "GhiChu" TEXT NULL,
    CONSTRAINT "chk_ngay_xoa" CHECK ("NgayKetThuc" >= "NgayBatDau")
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_saoluu_ngaytao" 
    ON "SaoLuuMinhChung"("NgayTao" DESC);

CREATE INDEX IF NOT EXISTS "idx_saoluu_taikhoan" 
    ON "SaoLuuMinhChung"("MaTaiKhoan");

CREATE INDEX IF NOT EXISTS "idx_saoluu_ngay_range" 
    ON "SaoLuuMinhChung"("NgayBatDau", "NgayKetThuc");

CREATE INDEX IF NOT EXISTS "idx_chitiet_saoluu" 
    ON "ChiTietSaoLuu"("MaSaoLuu");

CREATE INDEX IF NOT EXISTS "idx_chitiet_ghinhan" 
    ON "ChiTietSaoLuu"("MaGhiNhan");

CREATE INDEX IF NOT EXISTS "idx_chitiet_trangthai" 
    ON "ChiTietSaoLuu"("TrangThai")
    WHERE "TrangThai" = 'DaXoa';

CREATE INDEX IF NOT EXISTS "idx_xoa_ngaythuchien" 
    ON "XoaMinhChung"("NgayThucHien" DESC);

CREATE INDEX IF NOT EXISTS "idx_xoa_taikhoan" 
    ON "XoaMinhChung"("MaTaiKhoan");

CREATE INDEX IF NOT EXISTS "idx_xoa_saoluu" 
    ON "XoaMinhChung"("MaSaoLuu")
    WHERE "MaSaoLuu" IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE "SaoLuuMinhChung" IS 'Tracks evidence file backup operations performed by SoYTe admins';
COMMENT ON TABLE "ChiTietSaoLuu" IS 'Tracks individual files included in each backup and their deletion status';
COMMENT ON TABLE "XoaMinhChung" IS 'Tracks evidence file deletion operations after backup';

COMMENT ON COLUMN "SaoLuuMinhChung"."NgayBatDau" IS 'Start date of the backup date range';
COMMENT ON COLUMN "SaoLuuMinhChung"."NgayKetThuc" IS 'End date of the backup date range';
COMMENT ON COLUMN "SaoLuuMinhChung"."TongSoTep" IS 'Total number of files in the backup';
COMMENT ON COLUMN "SaoLuuMinhChung"."DungLuong" IS 'Total size of backup in bytes';
COMMENT ON COLUMN "SaoLuuMinhChung"."TrangThai" IS 'Backup status: HoanThanh, ThanhCong, ThatBai';

COMMENT ON COLUMN "ChiTietSaoLuu"."TrangThai" IS 'File status: DaSaoLuu, DaXoa, ThanhCong, ThatBai';
COMMENT ON COLUMN "ChiTietSaoLuu"."NgayXoa" IS 'Date when file was deleted from R2 storage';

COMMENT ON COLUMN "XoaMinhChung"."SoTepThanhCong" IS 'Number of files successfully deleted';
COMMENT ON COLUMN "XoaMinhChung"."SoTepThatBai" IS 'Number of files that failed to delete';
COMMENT ON COLUMN "XoaMinhChung"."DungLuongGiaiPhong" IS 'Total storage space freed in bytes';
