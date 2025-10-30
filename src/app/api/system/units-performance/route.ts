import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getDohUnitComparisonPage } from '@/lib/db/repositories';

type SortField = 'name' | 'compliance' | 'practitioners' | 'pending' | 'totalCredits';

const SORTABLE_FIELDS = new Set<SortField>([
  'name',
  'compliance',
  'practitioners',
  'pending',
  'totalCredits',
]);

function parseSortParams(
  searchParams: URLSearchParams,
): Array<{ field: SortField; direction: 'asc' | 'desc' }> {
  const sortValues = searchParams.getAll('sort');
  const entries: Array<{ field: SortField; direction: 'asc' | 'desc' }> = [];

  const segments = sortValues.length > 0
    ? sortValues.flatMap((value) => value.split(','))
    : [];

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const [fieldRaw, dirRaw] = trimmed.split(':');
    const field = fieldRaw?.trim();
    const direction = (dirRaw?.trim()?.toLowerCase() || 'asc') as 'asc' | 'desc';

    if (
      field &&
      SORTABLE_FIELDS.has(field as SortField) &&
      (direction === 'asc' || direction === 'desc')
    ) {
      entries.push({ field: field as SortField, direction });
    }
  }

  // Backwards compatibility with legacy sortBy/sortOrder params
  if (entries.length === 0) {
    const sortBy = searchParams.get('sortBy');
    const sortOrder = (searchParams.get('sortOrder') || 'asc').toLowerCase();

    if (sortBy && SORTABLE_FIELDS.has(sortBy as SortField)) {
      entries.push({
        field: sortBy as SortField,
        direction: sortOrder === 'desc' ? 'desc' : 'asc',
      });
    }
  }

  return entries;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    // Only SoYTe role can access units performance
    if (session.user.role !== 'SoYTe') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - SoYTe access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const requestedSorts = parseSortParams(searchParams);
    const effectiveSorts =
      requestedSorts.length > 0
        ? requestedSorts
        : [
            { field: 'compliance' as const, direction: 'desc' as const },
            { field: 'name' as const, direction: 'asc' as const },
          ];
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');

    const parsedPage = pageParam ? Number(pageParam) : undefined;
    const parsedPageSize = pageSizeParam ? Number(pageSizeParam) : undefined;

    const result = await getDohUnitComparisonPage({
      search: search.trim() || undefined,
      page: parsedPage,
      pageSize: parsedPageSize,
      sort: effectiveSorts,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        filters: {
          search: search.trim(),
        },
        sort: effectiveSorts,
      },
    });

  } catch (error) {
    console.error('Error fetching units performance:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
