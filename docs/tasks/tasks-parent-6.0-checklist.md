# Tasks: Parent Task 6.0 - Update JSON Templates with Signature Block Definitions

## Relevant Files

- `templates/core/*.json` - All 8 JSON template files to be updated - **UPDATING**
- `src/types/index.ts` - TypeScript interfaces for templates (needs signature block types) - **UPDATED**
- `src/services/template.ts` - Template loading service (verify compatibility)
- `src/services/openai.ts` - OpenAI service (will need to handle markers in output)
- `__tests__/services/template.test.ts` - Template service tests (must all pass)
- `docs/templates/template-schema.md` - Documentation for template structure (needs update)
- `docs/templates/signature-block-schema.md` - **NEW** - Comprehensive signature block schema documentation
- `docs/templates/examples/signature-schema-*.json` - **NEW** - Example signature block schemas
- `generated-documents/*` - Generated documents to analyze for signature placement

### Notes

- This is the highest priority task for Developer R
- Each document type requires investigation before implementation
- All existing tests must pass after implementation
- Coordinate with Developer G for main merge after completion
- Document generation will now include markers for signature/initial blocks

## Tasks

- [x] 6.0 Update JSON templates with signature block definitions
  - [x] 6.1 Design and document signature block JSON schema (Details: tasks-parent-6.1-detailed.md)
  - [x] 6.2 Patent Assignment Agreement signature/initial blocks
    - [x] 6.2.1 Investigate signature/initial requirements and positions
    - [x] 6.2.2 Implement blocks and test
    (Details: tasks-parent-6.2-detailed.md)
  - [x] 6.3 Trademark Application signature/initial blocks
    - [x] 6.3.1 Investigate signature/initial requirements and positions
    - [x] 6.3.2 Implement blocks and test
    (Details: tasks-parent-6.3-detailed.md)
  - [x] 6.4 Cease and Desist Letter signature/initial blocks
    - [x] 6.4.1 Investigate signature/initial requirements and positions
    - [x] 6.4.2 Implement blocks and test
    (Details: tasks-parent-6.4-detailed.md)
  - [x] 6.5 NDA IP Specific signature/initial blocks
    - [x] 6.5.1 Investigate signature/initial requirements and positions
    - [x] 6.5.2 Implement blocks and test
    (Details: tasks-parent-6.5-detailed.md)
  - [x] 6.6 Office Action Response signature/initial blocks
    - [x] 6.6.1 Investigate signature/initial requirements and positions
    - [x] 6.6.2 Implement blocks and test
    (Details: tasks-parent-6.6-detailed.md)
  - [x] 6.7 Patent License Agreement signature/initial blocks
    - [x] 6.7.1 Investigate signature/initial requirements and positions
    - [x] 6.7.2 Implement blocks and test
    (Details: tasks-parent-6.7-detailed.md)
  - [x] 6.8 Provisional Patent Application signature/initial blocks
    - [x] 6.8.1 Investigate signature/initial requirements and positions
    - [x] 6.8.2 Implement blocks and test
    (Details: tasks-parent-6.8-detailed.md)
  - [x] 6.9 Technology Transfer Agreement signature/initial blocks
    - [x] 6.9.1 Investigate signature/initial requirements and positions
    - [x] 6.9.2 Implement blocks and test
    - [x] 6.9.3 Create GUI field requirements documentation
    (Details: tasks-parent-6.9-detailed.md)
  - [x] 6.10 Update TypeScript interfaces and types (Details: tasks-parent-6.10-detailed.md)
  - [x] 6.11 Run and verify all existing tests pass (Details: tasks-parent-6.11-detailed.md)
  - [ ] 6.12 Create documentation for signature block schema (Details: tasks-parent-6.12-detailed.md) 