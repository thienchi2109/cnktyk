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
  // Only return 0 for rejected submissions
  // Show calculated credits for both pending (ChoDuyet) and approved (DaDuyet) submissions
  if (submission.TrangThaiDuyet === 'TuChoi') {
    return 0;
  }

  // For pending submissions, skip evidence validation to show potential credits
  // For approved submissions, enforce evidence requirement
  if (submission.TrangThaiDuyet === 'DaDuyet') {
    if (!isEvidenceSatisfied(activity?.YeuCauMinhChung, submission.FileMinhChungUrl)) {
      return 0;
    }
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
