import { z } from 'zod';

// Enum schemas matching PostgreSQL enums
export const CapQuanLySchema = z.enum(['SoYTe', 'BenhVien', 'TrungTam', 'PhongKham']);
export const TrangThaiLamViecSchema = z.enum(['DangLamViec', 'DaNghi', 'TamHoan']);
export const TrangThaiDuyetSchema = z.enum(['ChoDuyet', 'DaDuyet', 'TuChoi']);
export const QuyenHanSchema = z.enum(['SoYTe', 'DonVi', 'NguoiHanhNghe', 'Auditor']);
export const LoaiHoatDongSchema = z.enum(['KhoaHoc', 'HoiThao', 'NghienCuu', 'BaoCao']);
export const DonViTinhSchema = z.enum(['gio', 'tiet', 'tin_chi']);
export const TrangThaiThongBaoSchema = z.enum(['Moi', 'DaDoc']);

// UUID validation schema
export const UUIDSchema = z.string().uuid();

// DonVi (Healthcare Unit) schema
export const DonViSchema = z.object({
  MaDonVi: UUIDSchema,
  TenDonVi: z.string().min(1, 'Unit name is required'),
  CapQuanLy: CapQuanLySchema,
  MaDonViCha: UUIDSchema.nullable(),
  TrangThai: z.boolean().default(true),
});

export const CreateDonViSchema = DonViSchema.omit({ MaDonVi: true });
export const UpdateDonViSchema = CreateDonViSchema.partial();

// TaiKhoan (User Account) schema
export const TaiKhoanSchema = z.object({
  MaTaiKhoan: UUIDSchema,
  TenDangNhap: z.string().min(3, 'Username must be at least 3 characters'),
  MatKhauBam: z.string().min(1, 'Password hash is required'),
  QuyenHan: QuyenHanSchema,
  MaDonVi: UUIDSchema.nullable(),
  TrangThai: z.boolean().default(true),
  TaoLuc: z.date(),
});

export const CreateTaiKhoanSchema = TaiKhoanSchema.omit({ 
  MaTaiKhoan: true, 
  TaoLuc: true 
}).extend({
  MatKhau: z.string().min(6, 'Password must be at least 6 characters'),
});

export const UpdateTaiKhoanSchema = CreateTaiKhoanSchema.partial().omit({ MatKhau: true });

export const LoginSchema = z.object({
  TenDangNhap: z.string().min(1, 'Username is required'),
  MatKhau: z.string().min(1, 'Password is required'),
});

// NhanVien (Practitioner) schema
export const NhanVienSchema = z.object({
  MaNhanVien: UUIDSchema,
  HoVaTen: z.string().min(1, 'Full name is required'),
  SoCCHN: z.string().nullable(),
  NgayCapCCHN: z.date().nullable(),
  MaDonVi: UUIDSchema,
  TrangThaiLamViec: TrangThaiLamViecSchema.default('DangLamViec'),
  Email: z.string().email().nullable().or(z.literal('')),
  DienThoai: z.string().nullable(),
  ChucDanh: z.string().nullable(),
});

export const CreateNhanVienSchema = NhanVienSchema.omit({ MaNhanVien: true });
export const UpdateNhanVienSchema = CreateNhanVienSchema.partial().extend({
  MaDonVi: UUIDSchema.optional(),
});

// DanhMucHoatDong (Activity Catalog) schema
export const DanhMucHoatDongSchema = z.object({
  MaDanhMuc: UUIDSchema,
  TenDanhMuc: z.string().min(1, 'Activity name is required'),
  LoaiHoatDong: LoaiHoatDongSchema,
  DonViTinh: DonViTinhSchema.default('gio'),
  TyLeQuyDoi: z.number().min(0, 'Conversion rate must be non-negative').default(1.0),
  GioToiThieu: z.number().min(0).nullable(),
  GioToiDa: z.number().min(0).nullable(),
  YeuCauMinhChung: z.boolean().default(true),
  HieuLucTu: z.date().nullable(),
  HieuLucDen: z.date().nullable(),
}).refine(
  (data) => {
    if (data.GioToiThieu !== null && data.GioToiDa !== null) {
      return data.GioToiDa >= data.GioToiThieu;
    }
    return true;
  },
  {
    message: 'Maximum hours must be greater than or equal to minimum hours',
    path: ['GioToiDa'],
  }
).refine(
  (data) => {
    if (data.HieuLucTu !== null && data.HieuLucDen !== null) {
      return data.HieuLucDen >= data.HieuLucTu;
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['HieuLucDen'],
  }
);

export const CreateDanhMucHoatDongSchema = DanhMucHoatDongSchema.omit({ MaDanhMuc: true });
export const UpdateDanhMucHoatDongSchema = CreateDanhMucHoatDongSchema.partial();

// QuyTacTinChi (Credit Rules) schema
export const QuyTacTinChiSchema = z.object({
  MaQuyTac: UUIDSchema,
  TenQuyTac: z.string().min(1, 'Rule name is required'),
  TongTinChiYeuCau: z.number().min(0, 'Total credits must be non-negative').default(120),
  ThoiHanNam: z.number().int().min(1, 'Duration must be at least 1 year').default(5),
  TranTheoLoai: z.record(z.number()).nullable(),
  HieuLucTu: z.date().nullable(),
  HieuLucDen: z.date().nullable(),
  TrangThai: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.HieuLucTu !== null && data.HieuLucDen !== null) {
      return data.HieuLucDen >= data.HieuLucTu;
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['HieuLucDen'],
  }
);

export const CreateQuyTacTinChiSchema = QuyTacTinChiSchema.omit({ MaQuyTac: true });
export const UpdateQuyTacTinChiSchema = CreateQuyTacTinChiSchema.partial();

// GhiNhanHoatDong (Activity Record) schema
export const GhiNhanHoatDongSchema = z.object({
  MaGhiNhan: UUIDSchema,
  MaNhanVien: UUIDSchema,
  MaDanhMuc: UUIDSchema.nullable(),
  TenHoatDong: z.string().min(1, 'Activity name is required'),
  VaiTro: z.string().nullable(),
  ThoiGianBatDau: z.date().nullable(),
  ThoiGianKetThuc: z.date().nullable(),
  SoGio: z.number().min(0).nullable(),
  SoTinChiQuyDoi: z.number().min(0, 'Credits must be non-negative'),
  FileMinhChungUrl: z.string().url().nullable().or(z.literal('')),
  FileMinhChungETag: z.string().nullable(),
  FileMinhChungSha256: z.string().nullable(),
  FileMinhChungSize: z.number().int().min(0).nullable(),
  NguoiNhap: UUIDSchema,
  TrangThaiDuyet: TrangThaiDuyetSchema.default('ChoDuyet'),
  ThoiGianDuyet: z.date().nullable(),
  GhiChu: z.string().nullable(),
  CreatedAt: z.date(),
  UpdatedAt: z.date(),
}).refine(
  (data) => {
    if (data.ThoiGianBatDau !== null && data.ThoiGianKetThuc !== null) {
      return data.ThoiGianKetThuc >= data.ThoiGianBatDau;
    }
    return true;
  },
  {
    message: 'End time must be after start time',
    path: ['ThoiGianKetThuc'],
  }
);

export const CreateGhiNhanHoatDongSchema = GhiNhanHoatDongSchema.omit({ 
  MaGhiNhan: true, 
  CreatedAt: true, 
  UpdatedAt: true 
});

export const UpdateGhiNhanHoatDongSchema = CreateGhiNhanHoatDongSchema.partial().extend({
  MaNhanVien: UUIDSchema.optional(),
  NguoiNhap: UUIDSchema.optional(),
});

// File upload schema
export const FileUploadSchema = z.object({
  file: z.instanceof(File),
  activityId: UUIDSchema.optional(),
}).refine(
  (data) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    return allowedTypes.includes(data.file.type);
  },
  {
    message: 'File must be PDF, JPG, or PNG format',
    path: ['file'],
  }
).refine(
  (data) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    return data.file.size <= maxSize;
  },
  {
    message: 'File size must be less than 10MB',
    path: ['file'],
  }
);

// NhatKyHeThong (Audit Log) schema
export const NhatKyHeThongSchema = z.object({
  MaNhatKy: UUIDSchema,
  MaTaiKhoan: UUIDSchema.nullable(),
  HanhDong: z.string().nullable(),
  Bang: z.string().nullable(),
  KhoaChinh: z.string().nullable(),
  NoiDung: z.record(z.any()).nullable(),
  ThoiGian: z.date(),
  DiaChiIP: z.string().nullable(),
});

export const CreateNhatKyHeThongSchema = NhatKyHeThongSchema.omit({ 
  MaNhatKy: true, 
  ThoiGian: true 
});

// ThongBao (Notification) schema
export const ThongBaoSchema = z.object({
  MaThongBao: UUIDSchema,
  MaNguoiNhan: UUIDSchema,
  Loai: z.string().nullable(),
  ThongDiep: z.string().min(1, 'Message is required'),
  LienKet: z.string().nullable(),
  TrangThai: TrangThaiThongBaoSchema.default('Moi'),
  TaoLuc: z.date(),
});

export const CreateThongBaoSchema = ThongBaoSchema.omit({ 
  MaThongBao: true, 
  TaoLuc: true 
});

export const UpdateThongBaoSchema = CreateThongBaoSchema.partial().extend({
  MaNguoiNhan: UUIDSchema.optional(),
});

// Materialized View schemas
export const BaoCaoTienDoNhanVienSchema = z.object({
  MaNhanVien: UUIDSchema,
  HoVaTen: z.string(),
  MaDonVi: UUIDSchema,
  tong_tin_chi: z.number(),
  tu_ngay: z.date().nullable(),
  den_ngay: z.date().nullable(),
});

export const BaoCaoTongHopDonViSchema = z.object({
  MaDonVi: UUIDSchema,
  so_nguoi: z.number().int(),
  tong_tin_chi: z.number(),
});

// Export type definitions
export type DonVi = z.infer<typeof DonViSchema>;
export type CreateDonVi = z.infer<typeof CreateDonViSchema>;
export type UpdateDonVi = z.infer<typeof UpdateDonViSchema>;

export type TaiKhoan = z.infer<typeof TaiKhoanSchema>;
export type CreateTaiKhoan = z.infer<typeof CreateTaiKhoanSchema>;
export type UpdateTaiKhoan = z.infer<typeof UpdateTaiKhoanSchema>;
export type LoginCredentials = z.infer<typeof LoginSchema>;

export type NhanVien = z.infer<typeof NhanVienSchema>;
export type CreateNhanVien = z.infer<typeof CreateNhanVienSchema>;
export type UpdateNhanVien = z.infer<typeof UpdateNhanVienSchema>;

export type DanhMucHoatDong = z.infer<typeof DanhMucHoatDongSchema>;
export type CreateDanhMucHoatDong = z.infer<typeof CreateDanhMucHoatDongSchema>;
export type UpdateDanhMucHoatDong = z.infer<typeof UpdateDanhMucHoatDongSchema>;

export type QuyTacTinChi = z.infer<typeof QuyTacTinChiSchema>;
export type CreateQuyTacTinChi = z.infer<typeof CreateQuyTacTinChiSchema>;
export type UpdateQuyTacTinChi = z.infer<typeof UpdateQuyTacTinChiSchema>;

export type GhiNhanHoatDong = z.infer<typeof GhiNhanHoatDongSchema>;
export type CreateGhiNhanHoatDong = z.infer<typeof CreateGhiNhanHoatDongSchema>;
export type UpdateGhiNhanHoatDong = z.infer<typeof UpdateGhiNhanHoatDongSchema>;

export type FileUpload = z.infer<typeof FileUploadSchema>;

export type NhatKyHeThong = z.infer<typeof NhatKyHeThongSchema>;
export type CreateNhatKyHeThong = z.infer<typeof CreateNhatKyHeThongSchema>;

export type ThongBao = z.infer<typeof ThongBaoSchema>;
export type CreateThongBao = z.infer<typeof CreateThongBaoSchema>;
export type UpdateThongBao = z.infer<typeof UpdateThongBaoSchema>;

export type BaoCaoTienDoNhanVien = z.infer<typeof BaoCaoTienDoNhanVienSchema>;
export type BaoCaoTongHopDonVi = z.infer<typeof BaoCaoTongHopDonViSchema>;