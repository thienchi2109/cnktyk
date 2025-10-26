# Project Overview

## CNKTYKLT Compliance Management Platform

A modern web-based system for healthcare practitioner continuing education compliance tracking across the Department of Health and healthcare units in Vietnam.

### Core Purpose
Healthcare practitioners must continuously update their medical knowledge and demonstrate compliance over 5-year cycles (120 credits required). This platform replaces manual spreadsheet-based tracking with an automated, standardized system providing real-time visibility for unit-level and department-level management.

### Key Features
- **Practitioner Registry**: Track practitioners with unique license IDs, unit affiliations, roles, and 5-year cycle dates
- **Credit Management**: Configurable rules engine with automatic credit calculation and conversion
- **Activity Submission**: Standardized activity catalog with evidence file uploads and multi-level approval workflow
- **Compliance Tracking**: Real-time progress monitoring with automated alerts for at-risk practitioners
- **Role-Based Access**: Four user roles (DoH Admin, Unit Admin, Practitioner, Auditor) with appropriate permissions
- **Dashboards & Reports**: Multi-level dashboards with data visualization and CSV/PDF export capabilities
- **Audit Logging**: Immutable audit trail for all create/update/review actions

### User Roles
1. **SoYTe (Department of Health)**: Full system access, global oversight, policy management
2. **DonVi (Unit Admin)**: Unit-level management, practitioner oversight, activity approval
3. **NguoiHanhNghe (Practitioner)**: Self-service activity submission, personal compliance tracking
4. **Auditor**: Read-only access for compliance verification and reporting

### Business Rules
- 5-year compliance cycle per practitioner
- 120 total credits required (configurable)
- Activity categories with conversion rules and caps
- Evidence requirements for activity verification
- Alert thresholds: <70% (warning), <90% (at-risk) at 6/3/1 months before deadline
