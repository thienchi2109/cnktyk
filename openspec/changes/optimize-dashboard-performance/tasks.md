# Implementation Tasks

## 1. Critical Fixes (Week 1) ✅ COMPLETE

- [x] 1.1 Optimize Unit Metrics API
  - [x] 1.1.1 Rewrite `/api/units/[id]/metrics` to use single CTE query
  - [x] 1.1.2 Test query performance with EXPLAIN ANALYZE
  - [x] 1.1.3 Add query performance logging
  - [x] 1.1.4 Fixed column name bug (SoTinChi → SoGioTinChiQuyDoi)

- [x] 1.2 Add Pagination to Unit Admin Dashboard
  - [x] 1.2.1 Add pagination state (`page`, `totalPages`) to component
  - [x] 1.2.2 Update API fetch to include `limit=10` and `page` parameters
  - [x] 1.2.3 Add pagination controls UI
  - [x] 1.2.4 Pagination working with server-side filtering

## 2. High Priority (Week 2) 🚧 IN PROGRESS

- [ ] 2.1 Create Practitioner Dashboard API (Deferred)
  - [ ] 2.1.1 Create `/api/dashboard/practitioner/route.ts` endpoint
  - [ ] 2.1.2 Implement single query with all dashboard data (CTEs)
  - [ ] 2.1.3 Add authorization checks
  - [ ] 2.1.4 Write integration tests

- [ ] 2.2 Update Practitioner Dashboard Component (Deferred)
  - [ ] 2.2.1 Replace 4 API calls with single `/api/dashboard/practitioner` call
  - [ ] 2.2.2 Update state management
  - [ ] 2.2.3 Handle loading and error states
  - [ ] 2.2.4 Test data flow

- [x] 2.3 Implement Server-Side Filtering (PRIORITY) ✅
  - [x] 2.3.1 Remove client-side filtering logic from components
  - [x] 2.3.2 Verify API endpoints support filter parameters
  - [x] 2.3.3 Add debounce to search input (300ms)
  - [ ] 2.3.4 Test filter combinations (Ready for Testing)

## 3. Optimizations (Week 3)

- [ ] 3.1 Add Redis Caching
  - [ ] 3.1.1 Create `src/lib/cache.ts` with Redis client
  - [ ] 3.1.2 Add caching to Unit Metrics API (60s TTL)
  - [ ] 3.1.3 Add cache invalidation on data changes
  - [ ] 3.1.4 Test cache hit rates
  - [ ] 3.1.5 Add cache monitoring

- [ ] 3.2 Add Database Indexes
  - [ ] 3.2.1 Create migration file `004_add_dashboard_indexes.sql`
  - [ ] 3.2.2 Add indexes for NhanVien table
  - [ ] 3.2.3 Add indexes for GhiNhanHoatDong table
  - [ ] 3.2.4 Add indexes for ThongBao table
  - [ ] 3.2.5 Test index usage with EXPLAIN ANALYZE
  - [ ] 3.2.6 Monitor index performance

## 4. Testing & Documentation

- [ ] 4.1 Performance Testing
  - [ ] 4.1.1 Load test Unit Metrics API (target: <150ms p95)
  - [ ] 4.1.2 Load test Practitioner Dashboard API (target: <300ms p95)
  - [ ] 4.1.3 Test with 1000+ practitioners per unit
  - [ ] 4.1.4 Verify cache hit rates >70%

- [ ] 4.2 Integration Testing
  - [ ] 4.2.1 Test pagination edge cases
  - [ ] 4.2.2 Test filtering combinations
  - [ ] 4.2.3 Test cache invalidation
  - [ ] 4.2.4 Test error handling

- [ ] 4.3 Documentation
  - [ ] 4.3.1 Update API documentation
  - [ ] 4.3.2 Document caching strategy
  - [ ] 4.3.3 Add performance monitoring guide
  - [ ] 4.3.4 Update developer best practices

## 5. Deployment

- [ ] 5.1 Database Migration
  - [ ] 5.1.1 Backup production database
  - [ ] 5.1.2 Apply indexes using CONCURRENTLY
  - [ ] 5.1.3 Verify index creation

- [ ] 5.2 Code Deployment
  - [ ] 5.2.1 Deploy to staging
  - [ ] 5.2.2 Run performance tests on staging
  - [ ] 5.2.3 Deploy to production
  - [ ] 5.2.4 Monitor performance metrics

- [ ] 5.3 Rollback Plan
  - [ ] 5.3.1 Document rollback procedure
  - [ ] 5.3.2 Test rollback in staging
  - [ ] 5.3.3 Monitor error rates post-deployment
