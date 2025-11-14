import type { DanhMucHoatDong, GhiNhanHoatDong } from './schemas';

function hasNonEmptyString(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isEvidenceSatisfied(
  requiresEvidence: boolean | null | undefined,
  evidenceUrl: string | null | undefined,
): boolean {
  if (!requiresEvidence) {
    return true;
  }

  return hasNonEmptyString(evidenceUrl);
}

type SubmissionForCredit = Pick<
  GhiNhanHoatDong,
  'TrangThaiDuyet' | 'SoTiet' | 'SoGioTinChiQuyDoi' | 'FileMinhChungUrl'
>;

type ActivityForCredit = Pick<
  DanhMucHoatDong,
  'GioToiThieu' | 'GioToiDa' | 'YeuCauMinhChung'
> & {
  TyLeQuyDoi?: number | null;
};

export function calculateEffectiveCredits({
  submission,
  activity,
}: {
  submission: SubmissionForCredit;
  activity?: ActivityForCredit | null | undefined;
}): number {
  if (submission.TrangThaiDuyet !== 'DaDuyet') {
    return 0;
  }

  if (!isEvidenceSatisfied(activity?.YeuCauMinhChung, submission.FileMinhChungUrl)) {
    return 0;
  }

  const baseCredits =
    typeof submission.SoGioTinChiQuyDoi === 'number'
      ? submission.SoGioTinChiQuyDoi
      : typeof submission.SoTiet === 'number' && typeof activity?.TyLeQuyDoi === 'number'
        ? submission.SoTiet * activity.TyLeQuyDoi
        : 0;

  if (!activity) {
    return baseCredits;
  }

  const min = activity.GioToiThieu ?? null;
  if (min !== null && baseCredits < min) {
    return 0;
  }

  const max = activity.GioToiDa ?? null;
  if (max !== null && baseCredits > max) {
    return max;
  }

  return baseCredits;
}
