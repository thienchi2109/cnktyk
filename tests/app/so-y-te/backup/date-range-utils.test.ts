import { describe, expect, it } from 'vitest';
import {
  buildPresetRange,
  formatISODate,
  isRangeWithinYear,
} from '@/app/(authenticated)/so-y-te/backup/date-range-utils';

const anchorDate = new Date('2025-06-30T05:00:00Z');

describe('date-range-utils', () => {
  it('buildPresetRange returns the same start and end when months=0', () => {
    const range = buildPresetRange({ months: 0, anchor: anchorDate });

    expect(formatISODate(range.start)).toBe('2025-06-30');
    expect(formatISODate(range.end)).toBe('2025-06-30');
  });

  it('buildPresetRange subtracts months and keeps inclusive end date', () => {
    const range = buildPresetRange({ months: 3, anchor: anchorDate });

    expect(formatISODate(range.start)).toBe('2025-04-01');
    expect(formatISODate(range.end)).toBe('2025-06-30');
  });

  it('isRangeWithinYear returns true for ranges within 365 days inclusive', () => {
    const start = new Date('2024-07-01T00:00:00Z');
    const end = new Date('2025-06-30T23:59:59Z');

    expect(isRangeWithinYear(start, end)).toBe(true);
  });

  it('isRangeWithinYear returns false when the range exceeds 365 days', () => {
    const start = new Date('2024-06-30T00:00:00Z');
    const end = new Date('2025-06-30T23:59:59Z');

    expect(isRangeWithinYear(start, end)).toBe(false);
  });
});
