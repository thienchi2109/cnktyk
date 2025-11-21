/**
 * Test script to reproduce the Activity Report API 400 error
 * Run with: npx tsx scripts/test-activity-report-api.ts
 */

// Simulate the exact query parameters from the failing request
const testCases = [
  {
    name: 'Case 1: With showAll=false (failing case)',
    params: {
      unitId: '00000000-0000-0000-0000-000000000002',
      startDate: '2025-10-22',
      endDate: '2025-11-21',
      showAll: 'false',
    },
  },
  {
    name: 'Case 2: With showAll=true',
    params: {
      unitId: '00000000-0000-0000-0000-000000000002',
      startDate: '2025-10-22',
      endDate: '2025-11-21',
      showAll: 'true',
    },
  },
  {
    name: 'Case 3: Without showAll parameter',
    params: {
      unitId: '00000000-0000-0000-0000-000000000002',
      startDate: '2025-10-22',
      endDate: '2025-11-21',
    },
  },
  {
    name: 'Case 4: Minimal params (only unitId)',
    params: {
      unitId: '00000000-0000-0000-0000-000000000002',
    },
  },
];

console.log('='.repeat(80));
console.log('Activity Report API Test Cases');
console.log('='.repeat(80));
console.log('');

for (const testCase of testCases) {
  console.log(`\n${testCase.name}`);
  console.log('-'.repeat(80));

  const queryString = new URLSearchParams(
    Object.entries(testCase.params).filter(([_, v]) => v !== undefined)
  ).toString();

  console.log(`Query String: ${queryString}`);
  console.log(`Full URL: /api/reports/activities?${queryString}`);
  console.log('');
  console.log('Expected behavior:');
  console.log('  - Should NOT return 400 Bad Request');
  console.log('  - Should validate successfully');
  console.log('  - showAll should default to false if not provided');
  console.log('');
}

console.log('='.repeat(80));
console.log('To run actual HTTP tests, deploy this code and check server logs');
console.log('='.repeat(80));
