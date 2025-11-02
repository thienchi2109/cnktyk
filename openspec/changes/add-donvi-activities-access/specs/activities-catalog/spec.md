## ADDED Requirements
### Requirement: Activities catalog enforces scope visibility
The activities catalog MUST show entries according to user role and clearly indicate ownership scope.

#### Scenario: SoYTe views all activities
- **GIVEN** a SoYTe user opens the Activities page
- **WHEN** the catalog loads
- **THEN** the list returns both global activities (`MaDonVi IS NULL`) and every unit activity
- **AND** each entry displays a scope badge (`He thong` or unit name).

#### Scenario: DonVi views global and unit activities
- **GIVEN** a DonVi user assigned to unit `U1`
- **WHEN** the catalog loads
- **THEN** the list includes every global activity
- **AND** the list includes activities where `MaDonVi = U1`
- **AND** no activities from other units appear.

#### Scenario: Soft-deleted activities excluded by default
- **WHEN** any user loads the catalog
- **THEN** entries with `DaXoaMem = true` are excluded from the default tab
- **AND** SoYTe can access a dedicated view listing soft-deleted activities for restoration.

### Requirement: Activity mutations respect ownership
Activity create, update, delete, adopt, and restore operations MUST enforce role-specific permissions and ownership rules.

#### Scenario: DonVi creates unit activity
- **GIVEN** a DonVi user submits a create request
- **WHEN** the server processes the payload
- **THEN** it persists `MaDonVi` equal to the user’s unit
- **AND** ignores any client-supplied `MaDonVi`
- **AND** records `NguoiTao` and timestamps.

#### Scenario: DonVi edits own unit activity
- **GIVEN** a DonVi user edits an activity where `MaDonVi` matches their unit
- **WHEN** the update succeeds
- **THEN** `NguoiCapNhat` captures the user ID and `CapNhatLuc` records the timestamp.

#### Scenario: DonVi blocked from global adoption
- **GIVEN** a DonVi user attempts to adopt an activity to global scope
- **WHEN** the request sets `MaDonVi = NULL`
- **THEN** the API responds `403 Forbidden`
- **AND** an audit log entry records the denied action.

#### Scenario: SoYTe adopts unit activity
- **GIVEN** a SoYTe user updates an activity with `MaDonVi = U1`
- **WHEN** the request sets `MaDonVi = NULL`
- **THEN** the activity becomes global
- **AND** the audit log records `ADOPT_TO_GLOBAL` with previous unit ID.

#### Scenario: Soft delete instead of hard delete
- **WHEN** a user with delete permission removes an activity
- **THEN** the system sets `DaXoaMem = true`
- **AND** the entry disappears from default listings while remaining in the database.

#### Scenario: Restore soft-deleted activity
- **GIVEN** a soft-deleted activity
- **WHEN** an authorized user restores it
- **THEN** `DaXoaMem` resets to false
- **AND** the activity returns to the appropriate scope listing.

### Requirement: Catalog provenance is auditable
Every catalog mutation MUST capture provenance for compliance review.

#### Scenario: Audit log for create/update/delete/adopt
- **WHEN** an activity is created, updated, soft-deleted, restored, or adopted
- **THEN** the system appends a `NhatKyHeThong` entry with the action type, actor ID, role, scope (unit/global), and affected unit ID when applicable.

#### Scenario: Metadata fields populated
- **WHEN** an activity is created or updated
- **THEN** `NguoiTao`/`NguoiCapNhat` and `TaoLuc`/`CapNhatLuc` store the responsible account ID and timestamp.
