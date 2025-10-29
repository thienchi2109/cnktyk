/**
 * Excel Processing Library for Bulk Import
 * Handles Excel file generation, parsing, and validation
 */

import ExcelJS from 'exceljs';

export interface PractitionerRow {
  maNhanVien?: string;
  hoVaTen: string;
  ngaySinh?: Date;
  gioiTinh?: 'Nam' | 'Nữ' | 'Khác';
  khoaPhong?: string;
  chucVu?: string;
  trangThaiLamViec?: 'DangLamViec' | 'TamHoan' | 'DaNghi';
  soCCHN: string;
  ngayCapCCHN: Date;
  noiCap?: string;
  phamViChuyenMon?: string;
  rowNumber: number;
}

export interface ActivityRow {
  soCCHN: string;
  tenHoatDong: string;
  vaiTro?: string;
  ngayHoatDong: Date;
  soTinChi: number;
  trangThaiDuyet: 'ChoDuyet' | 'DaDuyet' | 'TuChoi';
  ngayDuyet?: Date;
  ghiChuDuyet?: string;
  urlMinhChung?: string;
  rowNumber: number;
}

export interface ParsedData {
  practitioners: PractitionerRow[];
  activities: ActivityRow[];
}

export interface ValidationError {
  sheet: 'Nhân viên' | 'Hoạt động';
  row: number;
  column: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  practitionersCount: number;
  activitiesCount: number;
}

export class ExcelProcessor {
  /**
   * Generate Excel template with formatting and instructions
   */
  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CNKTYKLT System';
    workbook.created = new Date();

    // Sheet 1: Practitioners
    const practitionersSheet = workbook.addWorksheet('Nhân viên', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });

    // Set column widths
    practitionersSheet.columns = [
      { key: 'maNhanVien', width: 15 },
      { key: 'hoVaTen', width: 25 },
      { key: 'ngaySinh', width: 15 },
      { key: 'gioiTinh', width: 12 },
      { key: 'khoaPhong', width: 20 },
      { key: 'chucVu', width: 20 },
      { key: 'tinhTrangCongTac', width: 20 },
      { key: 'soCCHN', width: 18 },
      { key: 'ngayCapCCHN', width: 15 },
      { key: 'noiCap', width: 20 },
      { key: 'phamViChuyenMon', width: 25 }
    ];

    // Header row
    const practitionersHeader = practitionersSheet.addRow([
      'Mã nhân viên',
      'Họ và tên *',
      'Ngày sinh',
      'Giới tính',
      'Khoa/Phòng',
      'Chức vụ',
      'Tình trạng công tác',
      'Số CCHN *',
      'Ngày cấp *',
      'Nơi cấp',
      'Phạm vi chuyên môn'
    ]);
    practitionersHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    practitionersHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    practitionersHeader.alignment = { horizontal: 'center', vertical: 'middle' };

    // Data type hints row
    const practitionersHints = practitionersSheet.addRow([
      'Text (Optional)',
      'Text (Required)',
      'DD/MM/YYYY (Optional)',
      'Nam/Nữ (Optional)',
      'Text (Optional)',
      'Text (Optional)',
      'Enum (Optional, mặc định: Đang làm việc)',
      'Text (Required)',
      'DD/MM/YYYY (Required)',
      'Text (Optional)',
      'Text (Optional)'
    ]);
    practitionersHints.font = { italic: true, color: { argb: 'FF808080' }, size: 9 };
    practitionersHints.alignment = { horizontal: 'center' };

    // Example data row (users should delete this before importing)
    const practitionersExample = practitionersSheet.addRow([
      'NV001',
      'Nguyễn Văn An',
      new Date(1985, 4, 15),
      'Nam',
      'Khoa Nội',
      'Bác sĩ CK II',
      'Đang làm việc',
      'CCHN-2023-001234',
      new Date(2023, 0, 15),
      'Sở Y Tế Cần Thơ',
      'Nội khoa'
    ]);
    practitionersExample.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC7CE' }
    };
    practitionersExample.font = { italic: true, color: { argb: 'FF9C0006' } };
    // Add note to first cell
    const noteCell = practitionersSheet.getCell('A3');
    if (noteCell.note) {
      noteCell.note = {
        texts: [{ text: '⚠️ Đây là dòng mẫu. Vui lòng XÓA dòng này trước khi nhập dữ liệu thật!' }]
      };
    }

    // Format date columns
    practitionersSheet.getColumn(3).numFmt = 'dd/mm/yyyy';
    practitionersSheet.getColumn(9).numFmt = 'dd/mm/yyyy';

    // Add data validation for gender (if supported)
    if ('dataValidations' in practitionersSheet) {
      // Gender dropdown
      (practitionersSheet as any).dataValidations.add('D4:D10000', {
        type: 'list',
        allowBlank: true,
        formulae: ['"Nam,Nữ,Khác"']
      });
      // Employment status dropdown
      ;(practitionersSheet as any).dataValidations.add('G4:G10000', {
        type: 'list',
        allowBlank: true,
        formulae: ['"Đang làm việc,Tạm hoãn,Đã nghỉ"']
      });
    }

    // Sheet 2: Activities
    const activitiesSheet = workbook.addWorksheet('Hoạt động', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });

    activitiesSheet.columns = [
      { key: 'soCCHN', width: 18 },
      { key: 'tenHoatDong', width: 40 },
      { key: 'vaiTro', width: 20 },
      { key: 'ngayHoatDong', width: 15 },
      { key: 'soTinChi', width: 12 },
      { key: 'trangThaiDuyet', width: 15 },
      { key: 'ngayDuyet', width: 15 },
      { key: 'ghiChuDuyet', width: 30 },
      { key: 'urlMinhChung', width: 40 }
    ];

    // Header row
    const activitiesHeader = activitiesSheet.addRow([
      'Số CCHN *',
      'Tên hoạt động *',
      'Vai trò',
      'Ngày hoạt động *',
      'Số tín chỉ *',
      'Trạng thái *',
      'Ngày duyệt',
      'Ghi chú duyệt',
      'URL minh chứng'
    ]);
    activitiesHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    activitiesHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    activitiesHeader.alignment = { horizontal: 'center', vertical: 'middle' };

    // Data type hints row
    const activitiesHints = activitiesSheet.addRow([
      'Text (Required)',
      'Text (Required)',
      'Text (Optional)',
      'DD/MM/YYYY (Required)',
      'Number (Required)',
      'Enum (Required)',
      'DD/MM/YYYY (Optional)',
      'Text (Optional)',
      'URL (Optional)'
    ]);
    activitiesHints.font = { italic: true, color: { argb: 'FF808080' }, size: 9 };
    activitiesHints.alignment = { horizontal: 'center' };

    // Example data row (users should delete this before importing)
    const activitiesExample = activitiesSheet.addRow([
      'CCHN-2023-001234',
      'Hội thảo Y học lâm sàng 2024',
      'Báo cáo viên',
      new Date(2024, 2, 15),
      5.5,
      'DaDuyet',
      new Date(2024, 2, 20),
      'Đã xác minh chứng chỉ',
      'https://storage.example.com/cert.pdf'
    ]);
    activitiesExample.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC7CE' }
    };
    activitiesExample.font = { italic: true, color: { argb: 'FF9C0006' } };
    // Add note to first cell
    const activityNoteCell = activitiesSheet.getCell('A3');
    if (activityNoteCell.note) {
      activityNoteCell.note = {
        texts: [{ text: '⚠️ Đây là dòng mẫu. Vui lòng XÓA dòng này trước khi nhập dữ liệu thật!' }]
      };
    }

    // Format date columns
    activitiesSheet.getColumn(4).numFmt = 'dd/mm/yyyy';
    activitiesSheet.getColumn(7).numFmt = 'dd/mm/yyyy';

    // Add data validation for status (if supported)
    if ('dataValidations' in activitiesSheet) {
      (activitiesSheet as any).dataValidations.add('F4:F10000', {
        type: 'list',
        allowBlank: false,
        formulae: ['"ChoDuyet,DaDuyet,TuChoi"']
      });
    }

    // Sheet 3: Instructions
    const instructionsSheet = workbook.addWorksheet('Hướng dẫn');
    instructionsSheet.getColumn(1).width = 100;

    const instructions = [
      { text: 'HƯỚNG DẪN NHẬP DỮ LIỆU HÀNG LOẠT', style: { bold: true, size: 16, color: { argb: 'FF4472C4' } } },
      { text: 'CNKTYKLT - Hệ thống quản lý tuân thủ CNKT', style: { size: 12 } },
      { text: '' },
      { text: '📋 TỔNG QUAN', style: { bold: true, size: 12 } },
      { text: 'File Excel này cho phép bạn nhập hàng loạt:' },
      { text: '• Thông tin nhân viên y tế' },
      { text: '• Lịch sử hoạt động CNKT của họ' },
      { text: '' },
      { text: '🔢 CÁC BƯỚC THỰC HIỆN', style: { bold: true, size: 12 } },
      { text: '1. Điền thông tin vào sheet "Nhân viên"' },
      { text: '2. Điền hoạt động vào sheet "Hoạt động"' },
      { text: '3. Lưu file và tải lên hệ thống' },
      { text: '4. Kiểm tra kết quả xác thực' },
      { text: '5. Xác nhận nhập dữ liệu' },
      { text: '' },
      { text: '⚠️ LƯU Ý QUAN TRỌNG', style: { bold: true, size: 12, color: { argb: 'FFFF0000' } } },
      { text: '• XÓA dòng 3 (dòng mẫu màu đỏ nhạt) trước khi nhập dữ liệu thật' },
      { text: '• Không xóa hoặc đổi tên các sheet' },
      { text: '• Không thay đổi tiêu đề cột (dòng 1)' },
      { text: '• Các trường có dấu * là bắt buộc' },
      { text: '• Số CCHN phải duy nhất trong đơn vị của bạn' },
      { text: '• Ngày hoạt động phải nằm trong kỳ CNKT' },
      { text: '• File tối đa 10MB' }
    ];

    instructions.forEach((line, index) => {
      const row = instructionsSheet.addRow([line.text]);
      if (line.style) {
        row.font = line.style;
      }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }

  /**
   * Parse Excel file and extract data
   */
  async parseFile(buffer: Buffer): Promise<ParsedData> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const practitioners: PractitionerRow[] = [];
    const activities: ActivityRow[] = [];

    // Parse Practitioners sheet
    const practitionersSheet = workbook.getWorksheet('Nhân viên');
    if (practitionersSheet) {
      practitionersSheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 2) return; // Skip header and hints rows only

        const values = row.values as any[];
        if (!values[2] && !values[7]) return; // Skip empty rows

        const tinhTrangRaw = values[7]?.toString().trim();
        const soCCHNVal = (values[8] ?? values[7])?.toString().trim() || '';
        const ngayCapVal = this.parseDate(values[9] ?? values[8]) || new Date();
        const noiCapVal = (values[10] ?? values[9])?.toString().trim();
        const phamViVal = (values[11] ?? values[10])?.toString().trim();

        practitioners.push({
          maNhanVien: values[1]?.toString().trim(),
          hoVaTen: values[2]?.toString().trim() || '',
          ngaySinh: this.parseDate(values[3]),
          gioiTinh: values[4]?.toString().trim() as any,
          khoaPhong: values[5]?.toString().trim(),
          chucVu: values[6]?.toString().trim(),
          trangThaiLamViec: this.mapEmploymentStatus(tinhTrangRaw),
          soCCHN: soCCHNVal,
          ngayCapCCHN: ngayCapVal,
          noiCap: noiCapVal,
          phamViChuyenMon: phamViVal,
          rowNumber
        });
      });
    }

    // Parse Activities sheet
    const activitiesSheet = workbook.getWorksheet('Hoạt động');
    if (activitiesSheet) {
      activitiesSheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 2) return; // Skip header and hints rows only

        const values = row.values as any[];
        if (!values[1] && !values[2]) return; // Skip empty rows

        activities.push({
          soCCHN: values[1]?.toString().trim() || '',
          tenHoatDong: values[2]?.toString().trim() || '',
          vaiTro: values[3]?.toString().trim(),
          ngayHoatDong: this.parseDate(values[4]) || new Date(),
          soTinChi: parseFloat(values[5]?.toString() || '0'),
          trangThaiDuyet: (values[6]?.toString().trim() || 'ChoDuyet') as any,
          ngayDuyet: this.parseDate(values[7]),
          ghiChuDuyet: values[8]?.toString().trim(),
          urlMinhChung: values[9]?.toString().trim(),
          rowNumber
        });
      });
    }

    return { practitioners, activities };
  }

  /**
   * Parse date from various formats
   */
  private parseDate(value: any): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    
    // Try parsing DD/MM/YYYY format
    if (typeof value === 'string') {
      const parts = value.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2]);
        return new Date(year, month, day);
      }
    }
    
    // Try parsing as number (Excel serial date)
    if (typeof value === 'number') {
      return new Date((value - 25569) * 86400 * 1000);
    }
    
    return undefined;
  }

  /**
   * Map human label or code to canonical TrangThaiLamViec enum
   */
  private mapEmploymentStatus(value?: string): 'DangLamViec' | 'TamHoan' | 'DaNghi' | undefined {
    if (!value) return undefined;
    const v = value.trim();
    const map: Record<string, 'DangLamViec' | 'TamHoan' | 'DaNghi'> = {
      'Đang làm việc': 'DangLamViec',
      'DangLamViec': 'DangLamViec',
      'Tạm hoãn': 'TamHoan',
      'TamHoan': 'TamHoan',
      'Đã nghỉ': 'DaNghi',
      'DaNghi': 'DaNghi',
    };
    return map[v] || undefined;
  }
}
