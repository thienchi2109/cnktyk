/**
 * Validation functions for bulk import
 */

import { PractitionerRow, ValidationError } from './excel-processor';

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

      // Optional: Tình trạng công tác validation (defaults to Đang làm việc)
      if (p.trangThaiLamViec && !['DangLamViec', 'TamHoan', 'DaNghi'].includes(p.trangThaiLamViec)) {
        errors.push({
          sheet: 'Nhân viên',
          row: p.rowNumber,
          column: 'G',
          field: 'Tình trạng công tác',
          message: 'Giá trị không hợp lệ. Hợp lệ: Đang làm việc/Tạm hoãn/Đã nghỉ hoặc DangLamViec/TamHoan/DaNghi',
          severity: 'error'
        });
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

  // validateActivities method removed - activities are now handled via separate bulk-submission feature
}
