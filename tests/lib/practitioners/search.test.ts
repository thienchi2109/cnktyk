import { describe, it, expect } from 'vitest';
import { normalizeVietnamese, searchPractitioners, sortPractitionersByName, type Practitioner } from '@/lib/practitioners/search';

describe('normalizeVietnamese', () => {
  it('should remove Vietnamese diacritics', () => {
    expect(normalizeVietnamese('Nguyễn Văn A')).toBe('nguyen van a');
    expect(normalizeVietnamese('Bác sĩ')).toBe('bac si');
    expect(normalizeVietnamese('Đào')).toBe('dao');
  });

  it('should handle already normalized text', () => {
    expect(normalizeVietnamese('Nguyen Van A')).toBe('nguyen van a');
  });

  it('should be case-insensitive', () => {
    expect(normalizeVietnamese('NGUYỄN VĂN A')).toBe('nguyen van a');
  });
});

describe('searchPractitioners', () => {
  const mockPractitioners: Practitioner[] = [
    {
      MaNhanVien: 'NV001',
      HoVaTen: 'Nguyễn Văn A',
      SoCCHN: 'BK-2024-001',
      ChucDanh: 'Bác sĩ',
    },
    {
      MaNhanVien: 'NV002',
      HoVaTen: 'Trần Thị B',
      SoCCHN: 'BK-2024-002',
      ChucDanh: 'Y tá',
    },
    {
      MaNhanVien: 'NV003',
      HoVaTen: 'Lê Văn C',
      SoCCHN: null,
      ChucDanh: 'Dược sĩ',
    },
  ];

  it('should return all practitioners when query is empty', () => {
    expect(searchPractitioners('', mockPractitioners)).toEqual(mockPractitioners);
    expect(searchPractitioners('  ', mockPractitioners)).toEqual(mockPractitioners);
  });

  it('should search by name with diacritics', () => {
    const results = searchPractitioners('Nguyễn', mockPractitioners);
    expect(results).toHaveLength(1);
    expect(results[0].MaNhanVien).toBe('NV001');
  });

  it('should search by name without diacritics', () => {
    const results = searchPractitioners('nguyen', mockPractitioners);
    expect(results).toHaveLength(1);
    expect(results[0].MaNhanVien).toBe('NV001');
  });

  it('should search by practitioner ID', () => {
    const results = searchPractitioners('NV002', mockPractitioners);
    expect(results).toHaveLength(1);
    expect(results[0].HoVaTen).toBe('Trần Thị B');
  });

  it('should search by certification number', () => {
    const results = searchPractitioners('BK-2024-001', mockPractitioners);
    expect(results).toHaveLength(1);
    expect(results[0].MaNhanVien).toBe('NV001');
  });

  it('should return empty array when no matches', () => {
    const results = searchPractitioners('XYZ999', mockPractitioners);
    expect(results).toHaveLength(0);
  });

  it('should be case-insensitive', () => {
    const results = searchPractitioners('NGUYEN', mockPractitioners);
    expect(results).toHaveLength(1);
  });
});

describe('sortPractitionersByName', () => {
  it('should sort practitioners alphabetically', () => {
    const unsorted: Practitioner[] = [
      { MaNhanVien: 'NV003', HoVaTen: 'Lê Văn C', SoCCHN: null, ChucDanh: null },
      { MaNhanVien: 'NV001', HoVaTen: 'Nguyễn Văn A', SoCCHN: null, ChucDanh: null },
      { MaNhanVien: 'NV002', HoVaTen: 'Trần Thị B', SoCCHN: null, ChucDanh: null },
    ];

    const sorted = sortPractitionersByName(unsorted);
    expect(sorted[0].HoVaTen).toBe('Lê Văn C');
    expect(sorted[1].HoVaTen).toBe('Nguyễn Văn A');
    expect(sorted[2].HoVaTen).toBe('Trần Thị B');
  });

  it('should not mutate original array', () => {
    const original: Practitioner[] = [
      { MaNhanVien: 'NV002', HoVaTen: 'Trần Thị B', SoCCHN: null, ChucDanh: null },
      { MaNhanVien: 'NV001', HoVaTen: 'Nguyễn Văn A', SoCCHN: null, ChucDanh: null },
    ];

    const sorted = sortPractitionersByName(original);
    expect(original[0].MaNhanVien).toBe('NV002'); // Should remain unchanged
    expect(sorted).not.toBe(original); // Should be a new array
  });
});
