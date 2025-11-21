/**
 * Test Zod schema validation for Activity Report
 * Run with: npx tsx scripts/test-zod-schema.ts
 */

import { z } from 'zod';

const DateParamSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isNaN(Date.parse(value)),
    { message: 'Invalid date format. Expected YYYY-MM-DD or ISO datetime string' }
  );

const ActivityReportFiltersSchema = z.object({
  unitId: z.string().uuid(),
  startDate: DateParamSchema.optional(),
  endDate: DateParamSchema.optional(),
  activityType: z.enum(['KhoaHoc', 'HoiThao', 'NghienCuu', 'BaoCao']).optional(),
  approvalStatus: z.enum(['ChoDuyet', 'DaDuyet', 'TuChoi', 'all']).optional(),
  practitionerId: z.string().uuid().optional(),
  showAll: z.boolean().default(false),
});

console.log('Testing Activity Report Schema Validation');
console.log('='.repeat(80));

const testCases = [
  {
    name: 'Case 1: Real failing request data',
    data: {
      unitId: '00000000-0000-0000-0000-000000000002',
      startDate: '2025-10-22',
      endDate: '2025-11-21',
      activityType: undefined,
      approvalStatus: undefined,
      practitionerId: undefined,
      showAll: false,
    },
  },
  {
    name: 'Case 2: showAll as true',
    data: {
      unitId: '00000000-0000-0000-0000-000000000002',
      startDate: '2025-10-22',
      endDate: '2025-11-21',
      activityType: undefined,
      approvalStatus: undefined,
      practitionerId: undefined,
      showAll: true,
    },
  },
  {
    name: 'Case 3: No dates',
    data: {
      unitId: '00000000-0000-0000-0000-000000000002',
      startDate: undefined,
      endDate: undefined,
      activityType: undefined,
      approvalStatus: undefined,
      practitionerId: undefined,
      showAll: false,
    },
  },
];

for (const testCase of testCases) {
  console.log(`\n${testCase.name}`);
  console.log('-'.repeat(80));
  console.log('Input:', JSON.stringify(testCase.data, null, 2));

  try {
    const result = ActivityReportFiltersSchema.parse(testCase.data);
    console.log('✅ Validation PASSED');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log('❌ Validation FAILED');
      console.log('Errors:');
      error.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. Path: ${issue.path.join('.')}`);
        console.log(`     Message: ${issue.message}`);
        console.log(`     Code: ${issue.code}`);
        if ('expected' in issue) {
          console.log(`     Expected: ${issue.expected}`);
        }
        if ('received' in issue) {
          console.log(`     Received: ${issue.received}`);
        }
      });
    } else {
      console.log('❌ Unexpected error:', error);
    }
  }
}

console.log('\n' + '='.repeat(80));
