## ADDED Requirements
### Requirement: Single submission persistence matches Neon schema
The single submission service SHALL persist individual activity records using only the columns defined on the Neon `GhiNhanHoatDong` table so that database column errors cannot occur.

#### Scenario: Successful submission persists schema-aligned payload
- **WHEN** a DonVi user submits a valid single activity via `/api/submissions`
- **THEN** the API writes the record using only columns defined on `GhiNhanHoatDong`
- **AND** the response returns HTTP 201 with the new submission metadata without triggering database column errors

#### Scenario: Type safety blocks unsupported columns
- **WHEN** a developer attempts to add an unsupported column (e.g., `FileMinhChungSha256`) to the single submission payload
- **THEN** TypeScript compilation fails because the submission repository types reject fields that are not part of the verified Neon `GhiNhanHoatDong` schema

### Requirement: Submission schema mismatch diagnostics
The single submission API SHALL provide actionable diagnostics when a database schema mismatch occurs while shielding internal column names from end users.

#### Scenario: Structured logging of database column errors
- **WHEN** the persistence layer encounters a database error caused by an unknown or missing column during submission creation
- **THEN** the API logs a structured error entry that includes the request identifier and the database error message for operators

#### Scenario: Deterministic error response for schema mismatch
- **WHEN** a schema mismatch occurs while processing a submission
- **THEN** the API responds with HTTP 500 and includes an `errorCode` set to `submission_schema_mismatch`
- **AND** the JSON body presents a stable, user-facing message without revealing database internals so client UX can provide consistent guidance
