# CNKTYKLT Compliance Management Platform

A modern web-based system for healthcare practitioner compliance tracking across the Department of Health and healthcare units. Built with Next.js 15, TypeScript, and a glassmorphism design system.

## Features

- **Healthcare Practitioner Management**: Track continuing education credits and compliance status
- **Role-Based Access Control**: Different interfaces for DoH, Unit Administrators, and Practitioners
- **Activity Submission & Approval**: Streamlined workflow for activity submission and review
- **Glassmorphism UI**: Modern glass-effect design system optimized for healthcare professionals
- **Real-time Compliance Tracking**: 5-year cycle monitoring with automated alerts
- **Evidence File Management**: Secure file upload with Cloudflare R2 integration

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

## Contributing

1. Review the feature specifications in `.kiro/specs/`
2. Follow the task-based implementation approach
3. Ensure all components follow the glassmorphism design system
4. Test with different user roles and permissions

## License

This project is proprietary software for the Department of Health.
