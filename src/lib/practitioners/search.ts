/**
 * Practitioner search utilities with Vietnamese diacritics support
 * Provides client-side filtering optimized for large lists (100+ items)
 */

export interface Practitioner {
  MaNhanVien: string;
  HoVaTen: string;
  SoCCHN: string | null;
  ChucDanh: string | null;
}

/**
 * Normalizes Vietnamese text by removing diacritics
 * Uses NFD (Canonical Decomposition) followed by removal of combining marks
 * Handles special Vietnamese characters like Đ/đ
 * 
 * @example
 * normalize("Nguyễn Văn A") => "nguyen van a"
 * normalize("Bác sĩ") => "bac si"
 * normalize("Đào") => "dao"
 */
export function normalizeVietnamese(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Searches practitioners by name, ID, or certification number
 * Uses Vietnamese diacritics-insensitive matching for better UX
 * 
 * @param query - Search term entered by user
 * @param practitioners - Array of practitioners to filter
 * @returns Filtered array of practitioners matching the query
 * 
 * @example
 * searchPractitioners("nguyen", practitioners) // Matches "Nguyễn Văn A"
 * searchPractitioners("BS-2024", practitioners) // Matches by MaNhanVien
 * searchPractitioners("BK-001", practitioners) // Matches by SoCCHN
 */
export function searchPractitioners(
  query: string,
  practitioners: Practitioner[]
): Practitioner[] {
  if (!query || query.trim() === '') {
    return practitioners;
  }

  const normalizedQuery = normalizeVietnamese(query);

  return practitioners.filter((practitioner) => {
    // Search in name (diacritics-insensitive)
    const normalizedName = normalizeVietnamese(practitioner.HoVaTen);
    if (normalizedName.includes(normalizedQuery)) {
      return true;
    }

    // Search in ID (case-insensitive)
    if (practitioner.MaNhanVien.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    // Search in certification number if available (case-insensitive)
    if (practitioner.SoCCHN && practitioner.SoCCHN.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    return false;
  });
}

/**
 * Sorts practitioners alphabetically by name
 * Uses Vietnamese collation for proper ordering
 * 
 * @param practitioners - Array of practitioners to sort
 * @returns Sorted array (new array, doesn't mutate input)
 */
export function sortPractitionersByName(practitioners: Practitioner[]): Practitioner[] {
  return [...practitioners].sort((a, b) => 
    a.HoVaTen.localeCompare(b.HoVaTen, 'vi-VN')
  );
}
