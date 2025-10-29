# CNKTYKLT Compliance Management Platform

A modern web-based system for healthcare practitioner compliance tracking across the Department of Health and healthcare units. Built with Next.js 15, TypeScript, and a glassmorphism design system.

## Features

- **Healthcare Practitioner Management**: Track continuing education credits and compliance status
- **Role-Based Access Control**: Different interfaces for DoH, Unit Administrators, and Practitioners
- **Activity Submission & Approval**: Streamlined workflow for activity submission and review
- **Glassmorphism UI**: Modern glass-effect design system optimized for healthcare professionals
- **Real-time Compliance Tracking**: 5-year cycle monitoring with automated alerts
- **Evidence File Management**: Secure file upload with Cloudflare R2 integration
- **Comprehensive Audit Logging**: Complete audit trail for all data modifications and user actions

## Technology Stack

- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **UI Framework**: Custom glassmorphism components with Tailwind CSS
- **Database**: Neon PostgreSQL (serverless)
- **File Storage**: Cloudflare R2
- **Authentication**: NextAuth.js with JWT sessions
- **Hosting**: Cloudflare Pages + Workers

## Project Structure

```
├── src/app/                 # Next.js App Router pages
├── components/              # Reusable UI components
│   ├── ui/                 # Base UI components (glass effects)
│   ├── forms/              # Form components
│   ├── dashboard/          # Dashboard-specific components
│   └── layout/             # Layout components
├── lib/                    # Utility libraries
│   ├── auth/              # Authentication utilities
│   ├── db/                # Database utilities
│   ├── utils/             # General utilities
│   └── validations/       # Zod validation schemas
├── types/                  # TypeScript type definitions
└── .kiro/specs/           # Feature specifications and requirements
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Neon PostgreSQL database
- Cloudflare R2 bucket (optional for file uploads)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy the environment variables:

```bash
cp .env.example .env.local
```

3. Configure your environment variables in `.env.local`:

```env
# Database Configuration
DATABASE_URL="your-neon-database-url"
DIRECT_URL="your-neon-direct-url"

# NextAuth Configuration
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Cloudflare R2 Configuration (optional)
CLOUDFLARE_R2_ACCESS_KEY_ID="your-access-key"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-secret-key"
CLOUDFLARE_R2_BUCKET_NAME="your-bucket-name"
CLOUDFLARE_R2_ENDPOINT="your-r2-endpoint"
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Feature Flags

- `ENABLE_DONVI_ACCOUNT_MANAGEMENT` (default: `false`): Controls whether DonVi (Unit Admin) users can access the account management UI, API, and related navigation. When disabled, DonVi users see a bilingual notice explaining the temporary restriction while SoYTe retains full access.
- Additional feature flags are documented in `.env.example` and `.env.production.template`.

#### Re-enabling DonVi Account Management

1. Set `ENABLE_DONVI_ACCOUNT_MANAGEMENT=true` in the relevant environment (`.env.local`, deployment dashboard, or secrets manager).
2. Redeploy or restart the application so the middleware, API routes, and UI layers pick up the new value.
3. Verify the **Người dùng** navigation link reappears for DonVi users and the disabled feature notice disappears.

## Design System

The platform uses a custom glassmorphism design system with healthcare-focused colors:

- **Medical Blue** (`#0066CC`): Primary actions and navigation
- **Medical Green** (`#00A86B`): Success states and approvals
- **Medical Amber** (`#F59E0B`): Warnings and alerts
- **Medical Red** (`#DC2626`): Critical alerts and errors

### Glass Components

- `GlassCard`: Semi-transparent cards with backdrop blur
- `GlassButton`: Interactive buttons with glass effects
- `GlassInput`: Form inputs with glass styling

## Development Workflow

This project follows a spec-driven development approach. Feature specifications are located in `.kiro/specs/compliance-management-platform/`:

- `requirements.md`: Feature requirements in EARS format
- `design.md`: Technical design and architecture
- `tasks.md`: Implementation task list

## Database Schema

The application uses an existing PostgreSQL schema (`v_1_init_schema.sql`) with the following key tables:

- `TaiKhoan`: User accounts and authentication
- `NhanVien`: Healthcare practitioner records
- `GhiNhanHoatDong`: Activity submissions and approvals
- `DonVi`: Healthcare units and organizational structure
- `NhatKyHeThong`: Comprehensive audit logging for all system operations

## Audit Logging System

The platform includes a comprehensive audit logging system that tracks:

- All data modifications (CREATE, UPDATE, DELETE operations)
- User authentication events (login/logout)
- File upload and download operations
- Activity approvals and rejections
- Data export and import operations

**Key Features:**
- Role-based access (SoYTe and Auditor roles only)
- Advanced filtering and search capabilities
- Record history tracking with before/after values
- File integrity verification with SHA-256 checksums
- CSV export for external analysis
- System-wide statistics and suspicious activity detection

**Documentation:** See `docs/audit-system.md` for detailed usage and API documentation.

**Access:** Navigate to `/audit` (requires SoYTe or Auditor role)

## Contributing

1. Review the feature specifications in `.kiro/specs/`
2. Follow the task-based implementation approach
3. Ensure all components follow the glassmorphism design system
4. Test with different user roles and permissions

## Production Deployment

### Quick Deploy

```bash
# 1. Verify environment
npm run verify:production

# 2. Build and check
npm run build:check

# 3. Deploy to Cloudflare Pages
npm run deploy:production

# 4. Seed initial data (first time only)
npm run seed:production
```

### Deployment Guides

- **Complete Guide**: See `docs/deployment-guide.md` for comprehensive deployment instructions
- **Cloudflare Setup**: See `docs/cloudflare-pages-setup.md` for Cloudflare Pages configuration
- **Security**: See `docs/security-hardening.md` for security best practices
- **Checklist**: See `docs/production-checklist.md` for pre/post-deployment verification

### Environment Variables

Copy `.env.production.template` and configure for your production environment:

```bash
cp .env.production.template .env.production
# Edit .env.production with your production values
```

**Critical variables:**
- `NEXTAUTH_URL` - Your production domain (HTTPS)
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `DATABASE_URL` - Neon production connection string
- `CF_R2_*` - Cloudflare R2 credentials

### CI/CD

Automatic deployment via GitHub Actions:
- **Production**: Push to `main` branch
- **Preview**: Create pull request

### Monitoring

- **Cloudflare Analytics**: Enabled by default
- **Error Tracking**: Configure Sentry (optional)
- **Logs**: View in Cloudflare Pages dashboard

### Support

For deployment issues:
1. Check `docs/deployment-guide.md` troubleshooting section
2. Run `npm run verify:production` for diagnostics
3. Review Cloudflare Pages deployment logs

## License

This project is proprietary software for the Department of Health.
