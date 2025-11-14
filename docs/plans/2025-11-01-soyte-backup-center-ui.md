# SoYTe Backup Center UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver the SoYTe Backup Center page that lets Department of Health admins download evidence backups within an inclusive date range and shows actionable guidance and feedback.

**Architecture:** Use a server component wrapper that enforces SoYTe access and renders a client-side `BackupCenterClient` responsible for UI state, validation, and calling the existing `/api/backup/evidence-files` endpoint. Reuse glassmorphism layout patterns and Tailwind utility classes for consistent styling, and centralize date-range math in a small util to keep logic testable.

**Tech Stack:** Next.js App Router (server + client components), React 19, TypeScript, Tailwind CSS via glasscn-ui, date-fns for date math, Fetch API, Vitest + @testing-library/dom for helper tests.

---

### Task 1: Scaffold protected route entry point

**Files:**
- Create: `src/app/(authenticated)/so-y-te/backup/page.tsx`

**Step 1: Draft server page skeleton**

```tsx
import { requireAuth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { BackupCenterClient } from './backup-center-client';

export default async function BackupPage() {
  const session = await requireAuth();

  if (session.user.role !== 'SoYTe') {
    redirect('/dashboard');
  }

  return <BackupCenterClient adminName={session.user.username} />;
}
```

**Step 2: Run type check to ensure the server component compiles**

```bash
npm run typecheck -- --pretty false
```

**Step 3: Stage the new file**

```bash
git add src/app/(authenticated)/so-y-te/backup/page.tsx
```

---

### Task 2: Create reusable date range helper with tests (TDD)

**Files:**
- Create: `src/app/(authenticated)/so-y-te/backup/date-range-utils.ts`
- Create: `tests/app/so-y-te/backup/date-range-utils.test.ts`

**Step 1: Write failing tests covering presets, validation, and inclusive ranges**

```ts
import { describe, expect, it } from 'vitest';
import { buildPresetRange, formatISODate, isRangeWithinYear } from '@/app/(authenticated)/so-y-te/backup/date-range-utils';

describe('date helpers', () => {
  it('buildPresetRange returns today for both bounds when months=0', () => {
    const today = new Date('2025-06-30T05:00:00Z');
    const range = buildPresetRange({ months: 0, anchor: today });
    expect(formatISODate(range.start)).toBe('2025-06-30');
    expect(formatISODate(range.end)).toBe('2025-06-30');
  });

  it('buildPresetRange subtracts months and keeps inclusive end', () => {
    const anchor = new Date('2025-06-30T03:00:00Z');
    const range = buildPresetRange({ months: 3, anchor });
    expect(formatISODate(range.start)).toBe('2025-04-01');
    expect(formatISODate(range.end)).toBe('2025-06-30');
  });

  it('isRangeWithinYear respects inclusive days', () => {
    const start = new Date('2024-07-01T00:00:00Z');
    const end = new Date('2025-06-30T23:59:59Z');
    expect(isRangeWithinYear(start, end)).toBe(true);
  });
});
```

**Step 2: Run the targeted tests to confirm RED**

```bash
npm run test -- tests/app/so-y-te/backup/date-range-utils.test.ts
```

**Step 3: Implement helper module with date-fns utilities**

```ts
import { addDays, format, startOfDay, subMonths } from 'date-fns';

export function formatISODate(value: Date | null): string {
  return value ? format(value, 'yyyy-MM-dd') : '';
}

export function buildPresetRange({ months, anchor = new Date() }: { months: number; anchor?: Date }) {
  const end = startOfDay(anchor);
  if (months === 0) {
    return { start: end, end };
  }
  const rawStart = subMonths(end, months);
  const start = addDays(rawStart, 1);
  return { start, end };
}

export function isRangeWithinYear(start: Date, end: Date): boolean {
  const yearInDays = 365;
  const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff <= yearInDays && diff >= 0;
}
```

**Step 4: Re-run the tests to confirm GREEN**

```bash
npm run test -- tests/app/so-y-te/backup/date-range-utils.test.ts
```

**Step 5: Stage helper and tests**

```bash
git add src/app/(authenticated)/so-y-te/backup/date-range-utils.ts tests/app/so-y-te/backup/date-range-utils.test.ts
```

---

### Task 3: Build Backup Center UI skeleton

**Files:**
- Create: `src/app/(authenticated)/so-y-te/backup/backup-center-client.tsx`

**Step 1: Draft component shell with layout and header**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { CalendarRange, DownloadCloud, Info } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/glass-button';
import { formatISODate, buildPresetRange } from './date-range-utils';

const datePresets = [
  { id: '1mo', label: '1 tháng', months: 1 },
  { id: '3mo', label: '3 tháng', months: 3 },
  { id: '6mo', label: '6 tháng', months: 6 },
  { id: '12mo', label: '1 năm', months: 12 },
] as const;

export function BackupCenterClient({ adminName }: { adminName: string }) {
  const today = useMemo(() => new Date(), []);
  const [startDate, setStartDate] = useState<Date | null>(buildPresetRange({ months: 3, anchor: today }).start);
  const [endDate, setEndDate] = useState<Date | null>(today);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-medical-blue/20 rounded-xl">
            <CalendarRange className="h-8 w-8 text-medical-blue" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Trung tâm Sao lưu minh chứng</h1>
            <p className="text-slate-600">Tạo bản sao lưu nội dung minh chứng đã được duyệt để lưu trữ ngoại tuyến.</p>
          </div>
        </div>
        <GlassCard className="p-6 space-y-6">
          {/* Date pickers + presets stub */}
          {/* Download actions stub */}
        </GlassCard>
      </div>
    </div>
  );
}
```

**Step 2: Run `npm run lint -- --max-warnings=0` to catch structural issues**

```bash
npm run lint -- --max-warnings=0
```

**Step 3: Stage the new file**

```bash
git add src/app/(authenticated)/so-y-te/backup/backup-center-client.tsx
```

---

### Task 4: Add date controls and validation state

**Files:**
- Modify: `src/app/(authenticated)/so-y-te/backup/backup-center-client.tsx`

**Step 1: Add controlled `<input type="date">` fields bound to helpers**

```tsx
const handleStartChange = (value: string) => {
  setStartDate(value ? new Date(`${value}T00:00:00`) : null);
};

const handleEndChange = (value: string) => {
  setEndDate(value ? new Date(`${value}T00:00:00`) : null);
};
```

**Step 2: Render fields with glass styling**

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <label className="flex flex-col gap-2">
    <span className="text-sm font-medium text-slate-600">Từ ngày</span>
    <input
      type="date"
      max={formatISODate(endDate)}
      value={formatISODate(startDate)}
      onChange={(event) => handleStartChange(event.target.value)}
      className="rounded-lg border border-white/40 bg-white/60 px-4 py-3 text-slate-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-medical-blue/60"
    />
  </label>
  <label className="flex flex-col gap-2">
    <span className="text-sm font-medium text-slate-600">Đến ngày</span>
    <input
      type="date"
      max={formatISODate(today)}
      min={formatISODate(startDate)}
      value={formatISODate(endDate)}
      onChange={(event) => handleEndChange(event.target.value)}
      className="rounded-lg border border-white/40 bg-white/60 px-4 py-3 text-slate-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-medical-blue/60"
    />
  </label>
</div>
```

**Step 3: Track validation errors and selected preset id**

```tsx
const [activePreset, setActivePreset] = useState<string | null>('3mo');
const [validationError, setValidationError] = useState<string | null>(null);
```

**Step 4: Stage updates**

```bash
git add src/app/(authenticated)/so-y-te/backup/backup-center-client.tsx
```

---

### Task 5: Wire quick preset buttons and range validation

**Files:**
- Modify: `src/app/(authenticated)/so-y-te/backup/backup-center-client.tsx`

**Step 1: Implement preset handler using utils**

```tsx
const applyPreset = (id: string, months: number) => {
  const range = buildPresetRange({ months, anchor: endDate ?? today });
  setStartDate(range.start);
  setEndDate(range.end);
  setActivePreset(id);
  setValidationError(null);
};
```

**Step 2: Render preset buttons with `Button`**

```tsx
<div className="flex flex-wrap gap-2">
  {datePresets.map((preset) => (
    <Button
      key={preset.id}
      type="button"
      variant={activePreset === preset.id ? 'default' : 'ghost'}
      size="sm"
      onClick={() => applyPreset(preset.id, preset.months)}
    >
      {preset.label}
    </Button>
  ))}
</div>
```

**Step 3: Add range validation using `isRangeWithinYear`**

```tsx
import { isRangeWithinYear } from './date-range-utils';

const validateRange = () => {
  if (!startDate || !endDate) {
    setValidationError('Vui lòng chọn đủ ngày bắt đầu và kết thúc.');
    return false;
  }
  if (startDate > endDate) {
    setValidationError('Ngày bắt đầu phải trước ngày kết thúc.');
    return false;
  }
  if (!isRangeWithinYear(startDate, endDate)) {
    setValidationError('Khoảng thời gian không được vượt quá 1 năm.');
    return false;
  }
  setValidationError(null);
  return true;
};
```

**Step 4: Stage updates**

```bash
git add src/app/(authenticated)/so-y-te/backup/backup-center-client.tsx
```

---

### Task 6: Implement download workflow with progress feedback

**Files:**
- Modify: `src/app/(authenticated)/so-y-te/backup/backup-center-client.tsx`

**Step 1: Track request state and feedback messages**

```tsx
const [isDownloading, setIsDownloading] = useState(false);
const [statusMessage, setStatusMessage] = useState<string | null>(null);
const [statusTone, setStatusTone] = useState<'success' | 'error' | 'info'>('info');
```

**Step 2: Create `handleDownload` using Fetch + blob save**

```tsx
const handleDownload = async () => {
  if (!validateRange()) {
    return;
  }
  setIsDownloading(true);
  setStatusMessage('Đang tạo tệp sao lưu, vui lòng đợi...');
  setStatusTone('info');

  try {
    const response = await fetch('/api/backup/evidence-files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: formatISODate(startDate),
        endDate: formatISODate(endDate),
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'Không thể tạo sao lưu.' }));
      throw new Error(payload.error ?? 'Không thể tạo sao lưu.');
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
    const filename = match?.[1] ?? `CNKTYKLT_Backup_${formatISODate(startDate)}_${formatISODate(endDate)}.zip`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    setStatusMessage('Sao lưu hoàn tất! Vui lòng kiểm tra thư mục tải xuống của bạn.');
    setStatusTone('success');
  } catch (error) {
    console.error('Backup download error:', error);
    setStatusMessage(
      error instanceof Error ? error.message : 'Không thể tạo tệp sao lưu. Vui lòng thử lại sau.'
    );
    setStatusTone('error');
  } finally {
    setIsDownloading(false);
  }
};
```

**Step 3: Render primary button and loading notice**

```tsx
<Button
  onClick={handleDownload}
  disabled={isDownloading}
  size="lg"
  className="min-w-[220px]"
>
  <DownloadCloud className="h-5 w-5 mr-2" />
  {isDownloading ? 'Đang tạo sao lưu...' : 'Tải xuống sao lưu'}
</Button>

{isDownloading && (
  <div className="mt-4">
    <LoadingNotice message="Hệ thống đang tổng hợp minh chứng và tạo tệp ZIP..." />
  </div>
)}
```

**Step 4: Stage updates**

```bash
git add src/app/(authenticated)/so-y-te/backup/backup-center-client.tsx
```

---

### Task 7: Add status alerts, instructions, and storage guidance

**Files:**
- Modify: `src/app/(authenticated)/so-y-te/backup/backup-center-client.tsx`

**Step 1: Render alert banner when `statusMessage` exists**

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

{statusMessage && (
  <Alert
    variant={statusTone === 'error' ? 'destructive' : 'default'}
    className={cn(
      'border-l-4',
      statusTone === 'success' && 'border-green-400 bg-green-50',
      statusTone === 'info' && 'border-blue-400 bg-blue-50',
      statusTone === 'error' && 'border-red-400 bg-red-50'
    )}
  >
    <AlertTitle>
      {statusTone === 'success' ? 'Hoàn tất' : statusTone === 'error' ? 'Không thành công' : 'Đang xử lý'}
    </AlertTitle>
    <AlertDescription>{statusMessage}</AlertDescription>
  </Alert>
)}
```

**Step 2: Append instructions panel**

```tsx
<GlassCard className="p-6 space-y-4">
  <div className="flex items-center gap-3">
    <div className="p-2 bg-medical-amber/20 rounded-lg">
      <Info className="h-5 w-5 text-medical-amber" />
    </div>
    <div>
      <h2 className="text-xl font-semibold text-slate-800">Hướng dẫn lưu trữ an toàn</h2>
      <p className="text-slate-600">Thực hiện ngay sau khi tải xuống tệp sao lưu.</p>
    </div>
  </div>
  <ol className="list-decimal list-inside space-y-2 text-slate-600">
    <li>Di chuyển tệp ZIP vào thư mục bảo mật nội bộ hoặc kho lưu trữ tuân thủ của Sở Y tế.</li>
    <li>Đặt tên thư mục theo cấu trúc `Backup/YYYY-MM-DD` để dễ tra cứu.</li>
    <li>Tạo bản sao dự phòng trên 01 vị trí lưu trữ khác nhau (ví dụ: NAS hoặc ổ cứng ngoài).</li>
    <li>Ghi chú lịch sử sao lưu vào sổ theo dõi nội bộ hoặc hệ thống quản trị.</li>
  </ol>
  <div>
    <h3 className="font-semibold text-slate-700">Đề xuất lưu trữ:</h3>
    <ul className="list-disc list-inside text-slate-600 space-y-1">
      <li>Google Drive hoặc OneDrive (thư mục chỉ đọc cho nhóm quản trị)</li>
      <li>Thiết bị NAS nội bộ với cơ chế RAID</li>
      <li>Ổ cứng gắn ngoài được niêm phong và lưu tủ an toàn</li>
    </ul>
  </div>
</GlassCard>
```

**Step 3: Stage updates**

```bash
git add src/app/(authenticated)/so-y-te/backup/backup-center-client.tsx
```

---

### Task 8: Ensure responsive behavior and accessibility

**Files:**
- Modify: `src/app/(authenticated)/so-y-te/backup/backup-center-client.tsx`

**Step 1: Verify layout spacing collapses on mobile**

- Add `space-y-4` on mobile stacks, ensure buttons wrap by using `flex flex-wrap`.
- Use `text-balance` utilities if available to keep instructions readable.

**Step 2: Confirm focus states on buttons and inputs**

- Ensure glass button classes already include focus rings; add `aria-live` to status container for screen readers.

```tsx
<div aria-live="polite" aria-atomic="true">
  {statusMessage && /* Alert markup */}
</div>
```

**Step 3: Stage updates**

```bash
git add src/app/(authenticated)/so-y-te/backup/backup-center-client.tsx
```

---

### Task 9: Validation and responsive polish

**Step 1: Update layout classes for smaller breakpoints**

- Ensure header wraps cleanly on mobile by using `flex-col` defaults with `sm:flex-row`.
- Add `text-balance` for long headings.
- Confirm alerts are wrapped in `aria-live` container for screen readers.

**Step 2: Verify focus management**

- Confirm `Button` focus ring works; add `aria-live` to status container.
- Ensure loading notice uses `aria-live="polite"`.

**Step 3: Run lint + typecheck + targeted tests**

```bash
npm run lint -- --max-warnings=0
npm run typecheck -- --pretty false
npm run test -- tests/app/so-y-te/backup/date-range-utils.test.ts
```

**Step 4: Manual QA checklist**
- Verify default preset selects 3 months and populates inputs.
- Change presets and confirm inputs update.
- Trigger validation errors (missing dates, start > end, >1 year).
- Run download flow and confirm success message.
- Use DevTools responsive emulator (375px, 768px, 1280px) to ensure layout holds.
- Use keyboard navigation to focus inputs and buttons.

Document manual findings in commit message notes.

---

### Task 10: Final review and commit

**Step 1: Review diff**

```bash
git status
git diff
```

**Step 2: Update OpenSpec checklist**

- Mark 1.2.1-1.2.11 completed in `openspec/changes/add-evidence-backup-and-cleanup/tasks.md`.
- Stage the tasks file.

**Step 3: Rerun OpenSpec validation**

```bash
npx openspec validate add-evidence-backup-and-cleanup --strict
```

**Step 4: Commit with descriptive message**

```bash
git commit -am "feat: add SoYTe backup center UI"
```

**Step 5: Commit checklist update**

```bash
git add openspec/changes/add-evidence-backup-and-cleanup/tasks.md
git commit -m "docs: update backup UI tasks completion"
```

**Step 6: Share verification summary with stakeholders**

- Mention lint, typecheck, targeted tests, and manual QA outcomes in final response.

---
