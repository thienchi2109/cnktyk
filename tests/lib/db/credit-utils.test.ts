import { describe, it, expect } from 'vitest';

import { calculateEffectiveCredits, isEvidenceSatisfied } from '@/lib/db/credit-utils';

const baseSubmission = {
  TrangThaiDuyet: 'DaDuyet' as const,
  SoTiet: 10,
  SoGioTinChiQuyDoi: 5,
  FileMinhChungUrl: null as string | null,
};

const baseActivity = {
  TyLeQuyDoi: 0.5,
  GioToiThieu: null as number | null,
  GioToiDa: null as number | null,
  YeuCauMinhChung: false,
};

describe('credit-utils', () => {
  describe('isEvidenceSatisfied', () => {
    it('returns true when evidence is not required', () => {
      expect(isEvidenceSatisfied(false, null)).toBe(true);
      expect(isEvidenceSatisfied(null, null)).toBe(true);
    });

    it('returns false when evidence required but missing', () => {
      expect(isEvidenceSatisfied(true, null)).toBe(false);
      expect(isEvidenceSatisfied(true, '')).toBe(false);
      expect(isEvidenceSatisfied(true, '   ')).toBe(false);
    });

    it('returns true when evidence required and provided', () => {
      expect(isEvidenceSatisfied(true, 'https://example.com/file.pdf')).toBe(true);
    });
  });

  describe('calculateEffectiveCredits', () => {
    it('returns stored credits when approved and no evidence required', () => {
      const credits = calculateEffectiveCredits({
        submission: baseSubmission,
        activity: baseActivity,
      });

      expect(credits).toBe(5);
    });

    it('returns 0 when submission is not approved', () => {
      const credits = calculateEffectiveCredits({
        submission: { ...baseSubmission, TrangThaiDuyet: 'ChoDuyet' },
        activity: baseActivity,
      });

      expect(credits).toBe(0);
    });

    it('returns 0 when evidence required but missing', () => {
      const credits = calculateEffectiveCredits({
        submission: baseSubmission,
        activity: { ...baseActivity, YeuCauMinhChung: true },
      });

      expect(credits).toBe(0);
    });

    it('calculates credits based on hours when stored value is undefined', () => {
      const credits = calculateEffectiveCredits({
        submission: { ...baseSubmission, SoGioTinChiQuyDoi: undefined as any },
        activity: { ...baseActivity, TyLeQuyDoi: 1 },
      });

      expect(credits).toBe(10);
    });

    it('enforces minimum threshold', () => {
      const credits = calculateEffectiveCredits({
        submission: { ...baseSubmission, SoGioTinChiQuyDoi: 2 },
        activity: { ...baseActivity, GioToiThieu: 3 },
      });

      expect(credits).toBe(0);
    });

    it('caps at maximum threshold', () => {
      const credits = calculateEffectiveCredits({
        submission: { ...baseSubmission, SoGioTinChiQuyDoi: 8 },
        activity: { ...baseActivity, GioToiDa: 6 },
      });

      expect(credits).toBe(6);
    });

    it('returns stored credits when evidence required and provided', () => {
      const credits = calculateEffectiveCredits({
        submission: { ...baseSubmission, FileMinhChungUrl: 'https://example.com/proof.pdf' },
        activity: { ...baseActivity, YeuCauMinhChung: true },
      });

      expect(credits).toBe(5);
    });
  });
});
