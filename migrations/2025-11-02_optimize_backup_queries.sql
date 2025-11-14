-- Optimize evidence backup lookups by date range and approval status
CREATE INDEX IF NOT EXISTS idx_ghinhan_backup_window
  ON "GhiNhanHoatDong" ("TrangThaiDuyet", "NgayGhiNhan")
  WHERE "FileMinhChungUrl" IS NOT NULL;

-- Support recent backup deletion safety checks by created timestamp
CREATE INDEX IF NOT EXISTS idx_sauluu_ngaytao
  ON "SaoLuuMinhChung" ("NgayTao" DESC);
