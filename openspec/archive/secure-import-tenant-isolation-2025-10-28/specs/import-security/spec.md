## ADDED Requirements

### Requirement: Import Tenant Isolation
The system SHALL enforce tenant isolation in the Excel import workflow so a DonVi can only validate and update practitioners belonging to its own unit.

#### Scenario: Validation scoped to unit
- WHEN a DonVi user uploads a file for validation
- THEN duplicate checks for SoCCHN are executed only within the user’s unit
- AND if a SoCCHN exists in another unit, the response MUST NOT reveal any PII and MUST flag the row as cross‑unit conflict

#### Scenario: Execute import cannot reassign other-unit records
- GIVEN a practitioner with SoCCHN already belongs to another unit
- WHEN the DonVi executes import
- THEN the system MUST NOT update that row nor change its MaDonVi
- AND the system MUST return an error for that row and continue processing others

#### Scenario: Upsert gating (same unit only)
- WHEN inserting with ON CONFLICT on SoCCHN
- THEN updates MUST only occur if the existing row’s MaDonVi equals the importing user’s unitId

#### Scenario: Unit derivation from session
- WHEN calling validate or execute
- THEN the unitId MUST be derived from session context and any client-provided unitId MUST be ignored

#### Scenario: Audit without PII leakage
- WHEN a cross-unit conflict occurs
- THEN an audit log MUST be recorded with masked SoCCHN (last 4), userId, unitId, and timestamp
