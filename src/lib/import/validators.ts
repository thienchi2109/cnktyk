/**
 * Validation functions for bulk import
 */

import { PractitionerRow, ActivityRow, ValidationError } from './excel-processor';

export class ImportValidator {
  /**
   * Validate practitioners data
   */
  validatePractitioners(practitioners: PractitionerRow[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const seenCCHN = new Set<string>();

    practitioners.forEach((p) => {
      // Required field: Họ và tên
      if (!p.hoVaTen || p.hoVaTen.trim() === '') {
        errors.push({
          sheet: 'Nhân viên',
          row: p.rowNumber,
          column: 'B',
          field: 'Họ và tên',
          message: 'Họ và tên là bắt buộc',
          severity: 'error'
        });
      } else if (p.hoVaTen.length > 255) {
        errors.push({
          sheet: 'Nhân viên',
          row: p.rowNumber,
          column: 'B',
          field: 'Họ và tên',
          message: 'Họ và tên không được vượt quá 255 ký tự',
          severity: 'error'
        });
      }

      // Required field: Số CCHN
      if (!p.soCCHN || p.soCCHN.trim() === '') {
        errors.push({
          sheet: 'Nhân viên',
          row: p.rowNumber,
          column: 'G',
          field: 'Số CCHN',
          message: 'Số CCHN là bắt buộc',
          severity: 'error'
        });
      } else {
        // Check for duplicates within file
        if (seenCCHN.has(p.soCCHN)) {
          errors.push({
            sheet: 'Nhân viên',
            row: p.rowNumber,
            column: 'G',
            field: 'Số CCHN',
            message: `Số CCHN "${p.soCCHN}" bị trùng lặp trong file`,
            severity: 'error'
          });
        }
        seenCCHN.add(p.soCCHN);

        if (p.soCCHN.length > 50) {
          errors.push({
            sheet: 'Nhân viên',
            row: p.rowNumber,
            column: 'G',
            field: 'Số CCHN',
            message: 'Số CCHN không được vượt quá 50 ký tự',
            severity: 'error'
          });
        }
      }

      // Required field: Ngày cấp
      if (!p.ngayCapCCHN) {
        errors.push({
          sheet: 'Nhân viên',
          row: p.rowNumber,
          column: 'H',
          field: 'Ngày cấp',
          message: 'Ngày cấp là bắt buộc',
          severity: 'error'
        });
      } else if (p.ngayCapCCHN > new Date()) {
        errors.push({
          sheet: 'Nhân viên',
          row: p.rowNumber,
          column: 'H',
          field: 'Ngày cấp',
          message: 'Ngày cấp không được là ngày trong tương lai',
          severity: 'error'
        });
      }

      // Optional: Ngày sinh validation
      if (p.ngaySinh) {
        const age = (new Date().getTime() - p.ngaySinh.getTime()) / (1000 * 60 * 60 * 24 * 365);
        if (age < 18) {
          errors.push({
            sheet: 'Nhân viên',
            row: p.rowNumber,
            column: 'C',
            field: 'Ngày sinh',
            message: 'Nhân viên phải đủ 18 tuổi',
            severity: 'error'
          });
        }
        if (age > 100) {
          errors.push({
            sheet: 'Nhân viên',
            row: p.rowNumber,
            column: 'C',
            field: 'Ngày sinh',
            message: 'Ngày sinh có vẻ không hợp lệ (quá 100 tuổi)',
            severity: 'warning'
          });
        }
      }

      // Optional: Giới tính validation
      if (p.gioiTinh && !['Nam', 'Nữ', 'Khác'].includes(p.gioiTinh)) {
        errors.push({
          sheet: 'Nhân viên',
          row: p.rowNumber,
          column: 'D',
          field: 'Giới tính',
          message: 'Giới tính phải là "Nam", "Nữ" hoặc "Khác"',
          severity: 'error'
        });
      }

      // Length validations
      if (p.khoaPhong && p.khoaPhong.length > 100) {
        errors.push({
          sheet: 'Nhân viên',
          row: p.rowNumber,
          column: 'E',
          field: 'Khoa/Phòng',
          message: 'Khoa/Phòng không được vượt quá 100 ký tự',
          severity: 'error'
        });
      }

      if (p.chucVu && p.chucVu.length > 100) {
        errors.push({
          sheet: 'Nhân viên',
          row: p.rowNumber,
          column: 'F',
          field: 'Chức vụ',
          message: 'Chức vụ không được vượt quá 100 ký tự',
          severity: 'error'
        });
      }

      if (p.noiCap && p.noiCap.length > 200) {
        errors.push({
          sheet: 'Nhân viên',
          row: p.rowNumber,
          column: 'I',
          field: 'Nơi cấp',
          message: 'Nơi cấp không được vượt quá 200 ký tự',
          severity: 'error'
        });
      }

      if (p.phamViChuyenMon && p.phamViChuyenMon.length > 200) {
        errors.push({
          sheet: 'Nhân viên',
          row: p.rowNumber,
          column: 'J',
          field: 'Phạm vi chuyên môn',
          message: 'Phạm vi chuyên môn không được vượt quá 200 ký tự',
          severity: 'error'
        });
      }
    });

    return errors;
  }

  /**
   * Validate activities data
   */
  validateActivities(
    activities: ActivityRow[],
    validCCHNs: Set<string>
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    activities.forEach((a) => {
      // Required field: Số CCHN
      if (!a.soCCHN || a.soCCHN.trim() === '') {
        errors.push({
          sheet: 'Hoạt động',
          row: a.rowNumber,
          column: 'A',
          field: 'Số CCHN',
          message: 'Số CCHN là bắt buộc',
          severity: 'error'
        });
      } else if (!validCCHNs.has(a.soCCHN)) {
        errors.push({
          sheet: 'Hoạt động',
          row: a.rowNumber,
          column: 'A',
          field: 'Số CCHN',
          message: `Số CCHN "${a.soCCHN}" không tồn tại trong sheet Nhân viên hoặc cơ sở dữ liệu`,
          severity: 'error'
        });
      }

      // Required field: Tên hoạt động
      if (!a.tenHoatDong || a.tenHoatDong.trim() === '') {
        errors.push({
          sheet: 'Hoạt động',
          row: a.rowNumber,
          column: 'B',
          field: 'Tên hoạt động',
          message: 'Tên hoạt động là bắt buộc',
          severity: 'error'
        });
      } else if (a.tenHoatDong.length > 500) {
        errors.push({
          sheet: 'Hoạt động',
          row: a.rowNumber,
          column: 'B',
          field: 'Tên hoạt động',
          message: 'Tên hoạt động không được vượt quá 500 ký tự',
          severity: 'error'
        });
      }

      // Required field: Ngày hoạt động
      if (!a.ngayHoatDong) {
        errors.push({
          sheet: 'Hoạt động',
          row: a.rowNumber,
          column: 'D',
          field: 'Ngày hoạt động',
          message: 'Ngày hoạt động là bắt buộc',
          severity: 'error'
        });
      } else {
        // Check if date is too far in the past
        const yearsDiff = (new Date().getTime() - a.ngayHoatDong.getTime()) / (1000 * 60 * 60 * 24 * 365);
        if (yearsDiff > 10) {
          errors.push({
            sheet: 'Hoạt động',
            row: a.rowNumber,
            column: 'D',
            field: 'Ngày hoạt động',
            message: 'Ngày hoạt động quá xa trong quá khứ (>10 năm)',
            severity: 'warning'
          });
        }

        // Check if date is in the future
        if (a.ngayHoatDong > new Date()) {
          errors.push({
            sheet: 'Hoạt động',
            row: a.rowNumber,
            column: 'D',
            field: 'Ngày hoạt động',
            message: 'Ngày hoạt động không được là ngày trong tương lai',
            severity: 'warning'
          });
        }
      }

      // Required field: Số tín chỉ
      if (a.soTinChi === undefined || a.soTinChi === null) {
        errors.push({
          sheet: 'Hoạt động',
          row: a.rowNumber,
          column: 'E',
          field: 'Số tín chỉ',
          message: 'Số tín chỉ là bắt buộc',
          severity: 'error'
        });
      } else {
        if (a.soTinChi < 0) {
          errors.push({
            sheet: 'Hoạt động',
            row: a.rowNumber,
            column: 'E',
            field: 'Số tín chỉ',
            message: 'Số tín chỉ không được âm',
            severity: 'error'
          });
        }
        if (a.soTinChi > 999.99) {
          errors.push({
            sheet: 'Hoạt động',
            row: a.rowNumber,
            column: 'E',
            field: 'Số tín chỉ',
            message: 'Số tín chỉ không được vượt quá 999.99',
            severity: 'error'
          });
        }
        if (a.soTinChi > 50) {
          errors.push({
            sheet: 'Hoạt động',
            row: a.rowNumber,
            column: 'E',
            field: 'Số tín chỉ',
            message: 'Số tín chỉ cao bất thường (>50), vui lòng kiểm tra lại',
            severity: 'warning'
          });
        }
      }

      // Required field: Trạng thái
      if (!a.trangThaiDuyet) {
        errors.push({
          sheet: 'Hoạt động',
          row: a.rowNumber,
          column: 'F',
          field: 'Trạng thái',
          message: 'Trạng thái là bắt buộc',
          severity: 'error'
        });
      } else if (!['ChoDuyet', 'DaDuyet', 'TuChoi'].includes(a.trangThaiDuyet)) {
        errors.push({
          sheet: 'Hoạt động',
          row: a.rowNumber,
          column: 'F',
          field: 'Trạng thái',
          message: 'Trạng thái phải là "ChoDuyet", "DaDuyet" hoặc "TuChoi"',
          severity: 'error'
        });
      }

      // Conditional: Ngày duyệt required if approved/rejected
      if (a.trangThaiDuyet && ['DaDuyet', 'TuChoi'].includes(a.trangThaiDuyet)) {
        if (!a.ngayDuyet) {
          errors.push({
            sheet: 'Hoạt động',
            row: a.rowNumber,
            column: 'G',
            field: 'Ngày duyệt',
            message: 'Ngày duyệt là bắt buộc khi trạng thái là "DaDuyet" hoặc "TuChoi"',
            severity: 'error'
          });
        } else if (a.ngayDuyet < a.ngayHoatDong) {
          errors.push({
            sheet: 'Hoạt động',
            row: a.rowNumber,
            column: 'G',
            field: 'Ngày duyệt',
            message: 'Ngày duyệt không được trước ngày hoạt động',
            severity: 'error'
          });
        }
      }

      // Optional field validations
      if (a.vaiTro && a.vaiTro.length > 100) {
        errors.push({
          sheet: 'Hoạt động',
          row: a.rowNumber,
          column: 'C',
          field: 'Vai trò',
          message: 'Vai trò không được vượt quá 100 ký tự',
          severity: 'error'
        });
      }

      if (a.ghiChuDuyet && a.ghiChuDuyet.length > 1000) {
        errors.push({
          sheet: 'Hoạt động',
          row: a.rowNumber,
          column: 'H',
          field: 'Ghi chú duyệt',
          message: 'Ghi chú duyệt không được vượt quá 1000 ký tự',
          severity: 'error'
        });
      }

      if (a.urlMinhChung) {
        try {
          new URL(a.urlMinhChung);
        } catch {
          errors.push({
            sheet: 'Hoạt động',
            row: a.rowNumber,
            column: 'I',
            field: 'URL minh chứng',
            message: 'URL minh chứng không hợp lệ',
            severity: 'error'
          });
        }
      }
    });

    return errors;
  }
}
