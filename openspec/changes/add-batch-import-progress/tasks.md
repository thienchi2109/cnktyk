## 1. Batch Processing Implementation

- [x] 1.1 Create `src/lib/import/batch-processor.ts` with batch INSERT utilities
- [x] 1.2 Add batch INSERT logic for practitioners in `import-service.ts`
- [x] 1.3 Add batch INSERT logic for activities in `import-service.ts`
- [x] 1.4 Add progress callback support to `executeImport` function
- [x] 1.5 Maintain transaction safety with extended timeout (120s)

## 2. Progress Tracking Implementation

- [x] 2.1 Convert `/api/import/execute` route to SSE streaming response
- [x] 2.2 Define TypeScript types for progress events
- [x] 2.3 Emit progress events during validation phase
- [x] 2.4 Emit progress events during practitioner batch processing
- [x] 2.5 Emit progress events during activity batch processing
- [x] 2.6 Calculate and include estimated time remaining

## 3. Client UI Implementation

- [x] 3.1 Add progress state management to `bulk-import-sheet.tsx`
- [x] 3.2 Implement SSE client connection and event parsing
- [x] 3.3 Create progress indicator component with Progress bar
- [x] 3.4 Add Vietnamese phase labels and formatting utilities
- [x] 3.5 Handle connection timeout and error states
- [x] 3.6 Display batch numbers and estimated time

## 4. Performance Metrics

- [x] 4.1 Add timing instrumentation to import service
- [x] 4.2 Calculate throughput metrics (records/second)
- [x] 4.3 Store performance metrics in audit log (NhatKyHeThong)
- [x] 4.4 Add phase-specific timing breakdown

## 5. Testing

- [ ] 5.1 Unit test batch size calculations and SQL generation
- [ ] 5.2 Unit test progress percentage calculations
- [ ] 5.3 Integration test end-to-end import with progress events
- [ ] 5.4 Test transaction rollback on batch failure
- [ ] 5.5 Test with 100/500/1000 record imports
- [ ] 5.6 Verify security checks maintained (unit scoping, CCHN validation)
- [ ] 5.7 Test SSE connection handling and timeout scenarios

## 6. Configuration & Documentation

- [x] 6.1 Add environment variables (IMPORT_BATCH_SIZE, IMPORT_TIMEOUT_MS)
- [x] 6.2 Extend database statement timeout to 120s
- [x] 6.3 Update import function documentation
- [x] 6.4 Add performance benchmarks to audit document
