
// Core database types based on existing schema

export interface TaiKhoan {
  MaTaiKhoan: string;      // UUID primary key
  TenDangNhap: string;     // Username (unique)
  MatKhauBam: string;      // bcrypt hashed password
  QuyenHan: 'SoYTe' | 'DonVi' | 'NguoiHanhNghe' | 'Auditor';
  MaDonVi?: string;        // Unit ID (nullable)
  TrangThai: boolean;      // Active status
  TaoLuc: Date;           // Created timestamp
}

export interface NhanVien {
  MaNhanVien: string;      // UUID primary key
  HoVaTen: string;         // Full name
  SoCCHN?: string;         // License number (unique)
  NgayCapCCHN?: Date;      // License issue date
  MaDonVi: string;         // Unit ID (required)
  TrangThaiLamViec: 'DangLamViec' | 'DaNghi' | 'TamHoan';
  Email?: string;
  DienThoai?: string;
  ChucDanh?: string;       // Position/title
}

export interface GhiNhanHoatDong {
  MaGhiNhan: string;       // UUID primary key
  MaNhanVien: string;      // Practitioner ID
  MaDanhMuc?: string | null;      // Activity catalog ID
  TenHoatDong: string;     // Activity name
  HinhThucCapNhatKienThucYKhoa?: string | null;
  ChiTietVaiTro?: string | null;
  DonViToChuc?: string | null;
  NgayBatDau?: Date | null;
  NgayKetThuc?: Date | null;
  SoTiet?: number | null;
  SoGioTinChiQuyDoi: number;  // Converted credits
  FileMinhChungUrl?: string | null;     // Evidence file URL
  BangChungSoGiayChungNhan?: string | null;
  NguoiNhap: string;       // Submitter ID
  CreationMethod: 'individual' | 'bulk' | 'api_import' | 'migration' | 'system';
  TrangThaiDuyet: 'ChoDuyet' | 'DaDuyet' | 'TuChoi';
  NgayDuyet?: Date | null;    // Approval timestamp
  GhiChuDuyet?: string | null;         // Comments
  NgayGhiNhan: Date;
}

export interface DonVi {
  MaDonVi: string;         // UUID primary key
  TenDonVi: string;        // Unit name
  LoaiDonVi: 'BenhVien' | 'TrungTam' | 'PhongKham';
  MaDonViCha?: string;     // Parent unit ID
  TrangThai: boolean;      // Active status
}

// API Response types
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Dashboard types
export interface DashboardStats {
  totalPractitioners: number;
  complianceRate: number;
  activitiesThisMonth: number;
  pendingApprovals: number;
}

export interface ComplianceProgress {
  currentCredits: number;
  requiredCredits: number;
  percentage: number;
  daysRemaining: number;
  status: 'good' | 'warning' | 'critical';
}
