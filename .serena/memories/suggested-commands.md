# Suggested Commands

## Development Commands

### Start Development Server
```bash
npm run dev
```
Starts Next.js development server with Turbopack on http://localhost:3000

### Build for Production
```bash
npm run build
```
Creates optimized production build with Turbopack

### Full Build Check (Recommended before commit)
```bash
npm run build:check
```
Runs typecheck + lint + build to ensure code quality

### Start Production Server
```bash
npm start
```
Starts production server (requires build first)

## Code Quality Commands

### Type Checking
```bash
npm run typecheck
```
Runs TypeScript compiler in noEmit mode to check for type errors

### Linting
```bash
npm run lint
```
Runs ESLint to check for code quality issues

### Auto-fix Linting Issues
```bash
npm run lint:fix
```
Automatically fixes ESLint issues where possible

### Quick Check (Type + Lint)
```bash
npm run check
```
Runs both typecheck and lint for quick validation

## Database Scripts (using tsx)

### Run Database Migrations
```bash
npx tsx scripts/run-migrations.ts
```

### Test Database Connection
```bash
npx tsx scripts/test-database.ts
```

### Test Repository Layer
```bash
npx tsx scripts/test-repositories.ts
```

### Test Core Functionality
```bash
npx tsx scripts/test-core-functionality.ts
```

### Test Complete System
```bash
npx tsx scripts/test-complete-system.ts
```

## Deployment Commands

### Deploy to Preview
```bash
npm run deploy:preview
```
Deploys to Cloudflare Pages preview environment

### Deploy to Production
```bash
npm run deploy:production
```
Deploys to Cloudflare Pages production environment

### Seed Production Data
```bash
npm run seed:production
```
Seeds initial data in production database

### Verify Production Setup
```bash
npm run verify:production
```
Verifies production environment configuration

## Windows System Commands

### List Files
```cmd
dir
```

### Remove File
```cmd
del file.txt
```

### Remove Directory
```cmd
rmdir /s /q dirname
```

### Copy File
```cmd
copy source.txt destination.txt
```

### Create Directory
```cmd
mkdir dirname
```

### View File Content
```cmd
type file.txt
```

### Command Separator
Use `&` to chain commands in CMD
