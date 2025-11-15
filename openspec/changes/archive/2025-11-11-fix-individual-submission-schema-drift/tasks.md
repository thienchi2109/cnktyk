## 1. Implementation
- [ ] 1.1 Re-confirm Neon `GhiNhanHoatDong` schema (including `CreationMethod`) and update submission validation/repository types to mirror it exactly.
- [ ] 1.2 Remove unsupported file metadata fields (`VaiTro`, `FileMinhChungETag`, `FileMinhChungSha256`, `FileMinhChungSize`) from the single submission API payload while eliminating the `as any` cast.
- [ ] 1.3 Enhance error handling to log structured database errors and return a deterministic error code for submission failures.
- [ ] 1.4 Add regression tests covering successful DonVi single submissions and schema-drift safeguards.
