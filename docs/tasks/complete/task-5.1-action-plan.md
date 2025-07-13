# Task 5.1 Action Plan: Next Steps

## Analysis Complete ✅

We've identified the key coupling points and refactoring needs. Here's what we found and what to do next.

## Key Findings

### 1. **Critical Blocker: File-Only Output**
- `LegalPDFGenerator` writes directly to file via `fs.createWriteStream`
- No way to get PDF as buffer for GUI
- Must refactor to support multiple output targets

### 2. **Component Coupling**
- All components created internally in `PDFExportService`
- No dependency injection
- Hard to test and mock

### 3. **GUI Limitations**
- Viewer only displays text/markdown
- No PDF rendering capability
- IPC handlers call CLI, not services directly

## Immediate Actions (Task 5.2)

### Step 1: Create Output Abstractions
```typescript
// New interfaces in src/types/pdf.ts
interface PDFOutput {
  write(chunk: Buffer): Promise<void>;
  end(): Promise<Buffer | void>;
}

class FileOutput implements PDFOutput { }
class BufferOutput implements PDFOutput { }
```

### Step 2: Refactor LegalPDFGenerator
- Accept `PDFOutput` instead of file path
- Remove direct file system dependency
- Support both file and buffer output

### Step 3: Update PDFExportService
- Add `exportToBuffer()` method
- Keep `export()` for backward compatibility
- Return structured result with metadata

### Step 4: Create Simple Integration Test
- Generate PDF to buffer
- Verify buffer contains valid PDF
- Ensure no file system side effects

## Future Steps (Tasks 5.3-5.5)

### Task 5.3: Enhanced API
- Implement `PDFExportResult` type
- Add progress abstraction
- Create factory methods

### Task 5.4: Dependency Injection
- Create component interfaces
- Implement constructor injection
- Update all tests

### Task 5.5: Integration Examples
- Create example usage code
- Document new API
- Migration guide for CLI

## Success Criteria
- [ ] PDF can be generated to buffer
- [ ] No breaking changes to CLI
- [ ] All existing tests pass
- [ ] New buffer tests added
- [ ] Ready for GUI integration

## Time Estimate
- Task 5.2: 2-3 hours (core refactoring)
- Task 5.3: 1-2 hours (API enhancement)
- Task 5.4: 2 hours (dependency injection)
- Task 5.5: 1 hour (documentation)

**Total: 6-8 hours for complete modularization**

## Next Command
Start Task 5.2: Extract Core PDF Service 