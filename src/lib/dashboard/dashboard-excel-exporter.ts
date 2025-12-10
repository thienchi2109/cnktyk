/**
 * Dashboard Excel Exporter
 * Generates Excel report for DoH Dashboard metrics
 */

import ExcelJS from 'exceljs';

export interface DashboardMetrics {
    totalUnits: number;
    totalPractitioners: number;
    activePractitioners: number;
    complianceRate: number;
    totalSubmissions: number;
    pendingApprovals: number;
    approvedThisMonth: number;
    rejectedThisMonth: number;
    totalCreditsAwarded: number;
    atRiskPractitioners: number;
    practitionersCompletedFull: number;
    practitionersIncomplete: number;
    practitionersPartialComplete: number;
    completionRate: number;
    partialCompletionRate: number;
}

export class DashboardExcelExporter {
    /**
     * Generate DoH Dashboard Excel report
     */
    async generateReport(metrics: DashboardMetrics): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'CNKTYKLT System';
        workbook.created = new Date();

        // Main report sheet
        const sheet = workbook.addWorksheet('Báo cáo CNKYKLT', {
            views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
        });

        // Set column widths
        sheet.columns = [
            { key: 'indicator', width: 70 },
            { key: 'count', width: 20 },
            { key: 'percentage', width: 20 },
            { key: 'notes', width: 35 }
        ];

        // Header row
        const headerRow = sheet.addRow([
            'Chỉ tiêu',
            'Tổng số lượng',
            'Tỷ lệ (%)',
            'Ghi chú'
        ]);

        // Style header
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1F4788' } // Dark blue
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 25;

        // Add borders to header
        headerRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
            };
        });

        // Helper function to add a row with styling
        const addDataRow = (
            indicator: string,
            count: string | number,
            percentage: string | number,
            notes: string,
            options: {
                bold?: boolean;
                indent?: number;
                background?: string;
            } = {}
        ) => {
            const row = sheet.addRow([indicator, count, percentage, notes]);

            // Font styling
            row.font = {
                bold: options.bold || false,
                size: 11
            };

            // Background color
            if (options.background) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: options.background }
                };
            }

            // Alignment
            row.getCell(1).alignment = {
                horizontal: 'left',
                vertical: 'top',
                indent: options.indent || 0
            };
            row.getCell(2).alignment = { horizontal: 'center', vertical: 'top' };
            row.getCell(3).alignment = { horizontal: 'center', vertical: 'top' };
            row.getCell(4).alignment = { horizontal: 'left', vertical: 'top' };

            // Borders
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFC0C0C0' } },
                    left: { style: 'thin', color: { argb: 'FFC0C0C0' } },
                    bottom: { style: 'thin', color: { argb: 'FFC0C0C0' } },
                    right: { style: 'thin', color: { argb: 'FFC0C0C0' } }
                };
            });

            return row;
        };

        // A. Total Practitioners
        addDataRow(
            'A. Tổng số người hành nghề y tế toàn ngành',
            metrics.totalPractitioners.toLocaleString('vi-VN'),
            '100%',
            'Toàn ngành',
            { bold: true, background: 'FFF2F2F2' }
        );

        // B. CPD Accumulation Status (Header)
        addDataRow(
            'B. Tình hình tích lũy CNKYKLT',
            '-',
            '-',
            '',
            { bold: true, background: 'FFF2F2F2' }
        );

        // B.1 Completed Full (120 hours)
        addDataRow(
            '1. Số người đã hoàn thành đủ 120 giờ tín chỉ trong chu kỳ 5 năm (theo quy định)',
            metrics.practitionersCompletedFull.toLocaleString('vi-VN'),
            `${metrics.completionRate}%`,
            'Đạt yêu cầu',
            { indent: 1 }
        );

        // B.2 Incomplete
        const incompleteRate = metrics.totalPractitioners > 0
            ? Math.round((metrics.practitionersIncomplete / metrics.totalPractitioners) * 100)
            : 0;

        addDataRow(
            '2. Số người chưa hoàn thành đủ 120 giờ tín chỉ trong chu kỳ 5 năm',
            metrics.practitionersIncomplete.toLocaleString('vi-VN'),
            `${incompleteRate}%`,
            'Cần nhắc nhở',
            { indent: 1 }
        );

        // B.3 Partial Complete (60-119 hours)
        addDataRow(
            '3. Số người đã hoàn thành > 50% tín chỉ (từ 60 - 119 giờ)',
            metrics.practitionersPartialComplete.toLocaleString('vi-VN'),
            `${metrics.partialCompletionRate}%`,
            'Đang tích lũy',
            { indent: 1 }
        );

        // C. Total Credits
        addDataRow(
            'C. Tổng số tín chỉ tích lũy được toàn ngành',
            metrics.totalCreditsAwarded.toLocaleString('vi-VN'),
            '-',
            'Giờ tín chỉ',
            { bold: true, background: 'FFF2F2F2' }
        );

        // D. System Status (Header)
        addDataRow(
            'D. Tình trạng hệ thống',
            '-',
            '-',
            '',
            { bold: true, background: 'FFF2F2F2' }
        );

        // D.1 Total Units
        addDataRow(
            '1. Tổng số đơn vị',
            metrics.totalUnits.toString(),
            '-',
            'Đang hoạt động',
            { indent: 1 }
        );

        // D.2 Pending Approvals
        addDataRow(
            '2. Hoạt động chờ duyệt',
            metrics.pendingApprovals.toString(),
            '-',
            'Cần xử lý',
            { indent: 1 }
        );

        // D.3 At Risk Practitioners
        const atRiskRate = metrics.totalPractitioners > 0
            ? Math.round((metrics.atRiskPractitioners / metrics.totalPractitioners) * 100)
            : 0;

        addDataRow(
            '3. Số người có nguy cơ không hoàn thành',
            metrics.atRiskPractitioners.toString(),
            `${atRiskRate}%`,
            'Cần theo dõi',
            { indent: 1 }
        );

        // Add metadata sheet
        const metadataSheet = workbook.addWorksheet('Thông tin');
        metadataSheet.addRow(['Báo cáo CNKYKLT - Sở Y Tế']);
        metadataSheet.addRow(['Thời gian xuất:', new Date().toLocaleString('vi-VN')]);
        metadataSheet.addRow(['']);
        metadataSheet.addRow(['Ghi chú:']);
        metadataSheet.addRow(['- Báo cáo này bao gồm tổng hợp số liệu CNKYKLT toàn ngành']);
        metadataSheet.addRow(['- Tín chỉ được tính theo chu kỳ 5 năm (120 giờ)']);
        metadataSheet.addRow(['- Dữ liệu được cập nhật tại thời điểm xuất báo cáo']);

        // Style metadata
        metadataSheet.getRow(1).font = { bold: true, size: 14 };
        metadataSheet.getRow(4).font = { bold: true };
        metadataSheet.getColumn(1).width = 80;

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
}
