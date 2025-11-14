import {
  differenceInCalendarDays,
  format,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns';

export const formatISODate = (value: Date | null): string => {
  if (!value) {
    return '';
  }
  return format(value, 'yyyy-MM-dd');
};

interface BuildPresetRangeOptions {
  months: number;
  anchor?: Date;
}

export const buildPresetRange = ({
  months,
  anchor = new Date(),
}: BuildPresetRangeOptions) => {
  const end = startOfDay(anchor);

  if (months <= 0) {
    return { start: end, end };
  }

  const startMonth = startOfMonth(end);
  const monthsToSubtract = Math.max(months - 1, 0);
  const start = monthsToSubtract === 0 ? startMonth : subMonths(startMonth, monthsToSubtract);

  return { start, end };
};

export const isRangeWithinYear = (start: Date, end: Date): boolean => {
  if (start > end) {
    return false;
  }

  const days = differenceInCalendarDays(end, start);

  return days <= 365;
};
