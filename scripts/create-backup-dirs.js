const fs = require('fs');
const path = require('path');

// Create directories for backup API
const dirs = [
  'src/app/api/backup/evidence-files',
  'src/app/api/backup/delete-archived'
];

dirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  fs.mkdirSync(fullPath, { recursive: true });
  console.log(`Created: ${dir}`);
});

console.log('✅ All directories created successfully');
