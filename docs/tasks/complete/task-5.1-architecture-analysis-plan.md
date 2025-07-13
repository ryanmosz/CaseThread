# Task 5.1 Plan: Analyze Current PDF Service Architecture

## Goal
Thoroughly analyze the current PDF generation service to identify coupling points, dependencies, and areas that need refactoring for GUI integration.

## Analysis Areas

### 1. Service Dependencies Analysis

**Current Structure:**
```
PDFExportService
├── Depends on file system (fs/promises)
├── Creates child components directly
├── Writes directly to file path
├── Progress callbacks tied to CLI
└── Logger with console output
```

**What to Document:**
- [ ] List all external dependencies (fs, path, etc.)
- [ ] Identify direct file I/O operations
- [ ] Map component creation and lifecycle
- [ ] Document side effects (console logs, file writes)
- [ ] Note configuration patterns

### 2. CLI Coupling Points

**Current Flow:**
```
CLI Command → PDFExportService.export() → File Output
     ↓                    ↓
  Progress UI        Console Logs
```

**What to Identify:**
- [ ] Progress callback pattern (`onProgress`)
- [ ] Error handling tied to CLI spinner
- [ ] File path validation in CLI
- [ ] Document type extraction logic
- [ ] Option parsing and transformation

### 3. Component Architecture

**Current Components:**
```
PDFExportService (Orchestrator)
├── LegalPDFGenerator (PDFKit wrapper)
├── DocumentFormatter (Rules engine)
├── SignatureBlockParser (Text parser)
├── PDFLayoutEngine (Layout calculator)
└── MarkdownParser (Inline formatting)
```

**What to Analyze:**
- [ ] Component initialization patterns
- [ ] Inter-component communication
- [ ] Shared state management
- [ ] Configuration propagation
- [ ] Error bubbling patterns

### 4. Data Flow Analysis

**Current Data Flow:**
1. Text input (string) → 
2. Document type detection →
3. Signature block parsing →
4. Layout calculation →
5. PDF generation →
6. File write

**What to Map:**
- [ ] Input format requirements
- [ ] Intermediate data structures
- [ ] Output options (currently file-only)
- [ ] Metadata handling
- [ ] Progress reporting points

### 5. Public API Surface

**Current API:**
```typescript
export(
  text: string,
  outputPath: string,
  documentType: string,
  options: PDFExportOptions
): Promise<void>
```

**What to Document:**
- [ ] Required vs optional parameters
- [ ] Return value limitations (void)
- [ ] Error types thrown
- [ ] Side effects per parameter
- [ ] Option structure complexity

## Analysis Deliverables

### 1. Dependency Graph
Create a visual or text-based graph showing:
- External dependencies (npm packages, Node APIs)
- Internal dependencies (project modules)
- Circular dependencies (if any)
- Optional vs required dependencies

### 2. Coupling Report
Document all coupling points:
- File system operations
- Console output locations
- CLI-specific logic
- Progress reporting mechanism
- Error handling patterns

### 3. Refactoring Recommendations
Based on analysis, identify:
- What needs to be abstracted
- What can remain as-is
- New interfaces needed
- Configuration changes required
- Testing implications

### 4. Integration Interface Design
Propose initial design for:
- Service initialization
- Input/output methods
- Progress reporting abstraction
- Error handling strategy
- Configuration approach

## Analysis Steps

### Step 1: Code Review (30 mins)
1. Read through `src/services/pdf-export.ts` thoroughly
2. Trace all import statements
3. List all method calls to external modules
4. Note all `console.log`, `fs` operations, and side effects

### Step 2: Dependency Mapping (20 mins)
1. Create list of all npm dependencies used
2. Map Node.js built-in module usage
3. Identify project module dependencies
4. Check for circular dependencies

### Step 3: Interface Analysis (20 mins)
1. Document current public methods
2. Analyze parameter requirements
3. Review return types and promises
4. List all thrown errors

### Step 4: CLI Integration Review (15 mins)
1. Review `src/commands/export.ts`
2. Document how options are transformed
3. Map progress UI integration
4. Note error handling patterns

### Step 5: Component Communication (15 mins)
1. Trace data flow between components
2. Document shared configuration
3. Map component lifecycle
4. Identify state management

### Step 6: Documentation (20 mins)
1. Compile findings into structured report
2. Create recommendation list
3. Design initial API proposal
4. List next steps for Task 5.2

## Success Criteria
- [ ] Complete understanding of current architecture
- [ ] All coupling points identified
- [ ] Clear refactoring path defined
- [ ] Initial API design proposed
- [ ] No critical dependencies missed

## Time Estimate
Total: ~2 hours for thorough analysis

## Next Steps
After analysis is complete:
1. Review findings with team
2. Prioritize refactoring tasks
3. Begin Task 5.2: Extract Core PDF Service 