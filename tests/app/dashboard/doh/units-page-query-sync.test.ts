import { describe, it, expect } from 'vitest';

describe('DOH Units Page - Query Parameter Synchronization', () => {
  describe('Search parameter encoding', () => {
    it('should encode search term in URL', () => {
      const params = new URLSearchParams();
      const search = 'Bệnh viện';
      params.set('search', search);

      expect(params.get('search')).toBe('Bệnh viện');
      expect(params.toString()).toBe('search=B%E1%BB%87nh+vi%E1%BB%87n');
    });

    it('should handle special characters in search', () => {
      const params = new URLSearchParams();
      const search = 'Unit & Test / Example';
      params.set('search', search);

      expect(params.get('search')).toBe(search);
    });
  });

  describe('Pagination parameter encoding', () => {
    it('should include page only when greater than 1', () => {
      const params1 = new URLSearchParams();
      const page1: number = 1;
      if (page1 > 1) params1.set('page', page1.toString());

      expect(params1.toString()).toBe('');

      const params2 = new URLSearchParams();
      const page2: number = 3;
      if (page2 > 1) params2.set('page', page2.toString());

      expect(params2.toString()).toBe('page=3');
    });

    it('should include pageSize only when not default (20)', () => {
      const params1 = new URLSearchParams();
      const pageSize1: number = 20;
      if (pageSize1 !== 20) params1.set('pageSize', pageSize1.toString());

      expect(params1.toString()).toBe('');

      const params2 = new URLSearchParams();
      const pageSize2: number = 50;
      if (pageSize2 !== 20) params2.set('pageSize', pageSize2.toString());

      expect(params2.toString()).toBe('pageSize=50');
    });
  });

  describe('Sort parameter encoding', () => {
    it('should encode multi-field sort as comma-separated', () => {
      const sorts = [
        { field: 'compliance' as const, direction: 'desc' as const },
        { field: 'name' as const, direction: 'asc' as const },
      ];
      const sortStr = sorts.map((s) => `${s.field}:${s.direction}`).join(',');

      expect(sortStr).toBe('compliance:desc,name:asc');
    });

    it('should skip default sort in URL', () => {
      const sorts = [
        { field: 'compliance' as const, direction: 'desc' as const },
        { field: 'name' as const, direction: 'asc' as const },
      ];
      const sortStr = sorts.map((s) => `${s.field}:${s.direction}`).join(',');
      const defaultSortStr = 'compliance:desc,name:asc';

      const params = new URLSearchParams();
      if (sortStr !== defaultSortStr) {
        params.set('sort', sortStr);
      }

      expect(params.toString()).toBe('');
    });

    it('should include non-default sort in URL', () => {
      const sorts = [
        { field: 'practitioners' as const, direction: 'asc' as const },
      ];
      const sortStr = sorts.map((s) => `${s.field}:${s.direction}`).join(',');
      const defaultSortStr = 'compliance:desc,name:asc';

      const params = new URLSearchParams();
      if (sortStr !== defaultSortStr) {
        params.set('sort', sortStr);
      }

      expect(params.toString()).toBe('sort=practitioners%3Aasc');
    });
  });

  describe('Unit selection parameter', () => {
    it('should include unit ID when selected', () => {
      const params = new URLSearchParams();
      const unitId = 'unit-123';
      if (unitId) params.set('unit', unitId);

      expect(params.get('unit')).toBe('unit-123');
    });

    it('should omit unit when null', () => {
      const params = new URLSearchParams();
      const unitId: string | null = null;
      if (unitId) params.set('unit', unitId);

      expect(params.toString()).toBe('');
    });
  });

  describe('Complete query string building', () => {
    it('should build complete URL with all parameters', () => {
      const params = new URLSearchParams();
      const search = 'test';
      const page: number = 2;
      const pageSize: number = 50;
      const sortStr = 'name:asc';
      const unit = 'unit-456';

      if (search) params.set('search', search);
      if (page > 1) params.set('page', page.toString());
      if (pageSize !== 20) params.set('pageSize', pageSize.toString());
      params.set('sort', sortStr);
      if (unit) params.set('unit', unit);

      expect(params.toString()).toBe('search=test&page=2&pageSize=50&sort=name%3Aasc&unit=unit-456');
    });

    it('should build minimal URL with defaults', () => {
      const params = new URLSearchParams();
      const search = '';
      const page: number = 1;
      const pageSize: number = 20;
      const sortStr = 'compliance:desc,name:asc';
      const defaultSortStr = 'compliance:desc,name:asc';
      const unit: string | null = null;

      if (search) params.set('search', search);
      if (page > 1) params.set('page', page.toString());
      if (pageSize !== 20) params.set('pageSize', pageSize.toString());
      if (sortStr !== defaultSortStr) params.set('sort', sortStr);
      if (unit) params.set('unit', unit);

      expect(params.toString()).toBe('');
    });
  });
});
