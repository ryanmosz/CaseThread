# Tasks: Parent Task 6.0 - Update JSON Templates with Signature Block Definitions

## Relevant Files

- `templates/core/*.json` - All 8 JSON template files to be updated
- `src/types/index.ts` - TypeScript interfaces for templates (needs signature block types)
- `src/services/template.ts` - Template loading service (verify compatibility)
- `__tests__/services/template.test.ts` - Template service tests (must all pass)
- `docs/templates/template-schema.md` - Documentation for template structure (needs update)

### Notes

- This is the highest priority task for Developer R
- All existing tests must pass after implementation
- Coordinate with Developer G for main merge after completion
- No changes to document generation logic - only adding metadata

## Tasks

- [ ] 6.0 Update JSON templates with signature block definitions
  - [ ] 6.1 Design and document signature block JSON schema (Details: tasks-parent-6.1-detailed.md)
  - [ ] 6.2 Update patent-assignment-agreement template (Details: tasks-parent-6.2-detailed.md)
  - [ ] 6.3 Update trademark-application template (Details: tasks-parent-6.3-detailed.md)
  - [ ] 6.4 Update remaining 6 document templates (Details: tasks-parent-6.4-detailed.md)
  - [ ] 6.5 Update TypeScript interfaces and types (Details: tasks-parent-6.5-detailed.md)
  - [ ] 6.6 Run and verify all existing tests pass (Details: tasks-parent-6.6-detailed.md)
  - [ ] 6.7 Create documentation for signature block schema (Details: tasks-parent-6.7-detailed.md) 