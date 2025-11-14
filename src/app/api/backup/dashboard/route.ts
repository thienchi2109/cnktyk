import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import {
  saoLuuMinhChungRepo,
  xoaMinhChungRepo,
} from '@/lib/db/repositories';

const RECENT_LIMIT = 6;

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
  }

  if (user.role !== 'SoYTe') {
    return NextResponse.json(
      { error: 'Chỉ tài khoản Sở Y tế mới có quyền xem trung tâm sao lưu.' },
      { status: 403 },
    );
  }

  const [backups, deletions] = await Promise.all([
    saoLuuMinhChungRepo.findByUser(user.id, RECENT_LIMIT),
    xoaMinhChungRepo.findByUser(user.id, RECENT_LIMIT),
  ]);

  const recentBackups = backups.map((item) => ({
    id: item.MaSaoLuu,
    startDate: item.NgayBatDau.toISOString(),
    endDate: item.NgayKetThuc.toISOString(),
    totalFiles: item.TongSoTep,
    totalBytes: item.DungLuong ?? 0,
    status: item.TrangThai,
    note: item.GhiChu,
    createdAt: item.NgayTao.toISOString(),
  }));

  const recentDeletions = deletions.map((item) => ({
    id: item.MaXoa,
    startDate: item.NgayBatDau.toISOString(),
    endDate: item.NgayKetThuc.toISOString(),
    totalFiles: item.TongSoTep,
    deletedFiles: item.SoTepThanhCong,
    failedFiles: item.SoTepThatBai,
    freedBytes: item.DungLuongGiaiPhong ?? 0,
    executedAt: item.NgayThucHien.toISOString(),
    note: item.GhiChu,
  }));

  const totalBackedUpBytes = recentBackups.reduce(
    (acc, item) => acc + (Number.isFinite(item.totalBytes) ? item.totalBytes : 0),
    0,
  );
  const totalFreedBytes = deletions.reduce(
    (acc, item) => acc + (item.DungLuongGiaiPhong ?? 0),
    0,
  );

  const responseBody = {
    recentBackups,
    recentDeletions,
    summary: {
      totalBackups: backups.length,
      totalDeletions: deletions.length,
      totalBackedUpBytes,
      totalFreedBytes,
      lastBackupAt: recentBackups[0]?.createdAt ?? null,
      lastDeletionAt: recentDeletions[0]?.executedAt ?? null,
    },
  };

  return NextResponse.json(responseBody);
}
