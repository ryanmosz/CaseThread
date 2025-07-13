# System Patterns

## Architecture Overview
CaseThread follows a multi-agent architecture with specialized agents for different phases of document generation. The system uses PDFKit for PDF generation and ChromaDB for legal precedent retrieval.

## Multi-Agent System
- **ContextBuilderAgent**: Retrieves and assembles relevant legal precedents
- **DraftingAgent**: Generates document content using templates and context
- **OverseerAgent**: Reviews and refines generated documents
- **Orchestrator**: Coordinates agent interactions

## PDF Generation Infrastructure
- **PDFExportService**: Main service for PDF generation
- **LegalPDFGenerator**: Handles low-level PDF creation using PDFKit
- **DocumentFormatter**: Applies document-specific formatting rules
- **MarkdownParser**: Processes Markdown syntax in documents
- **SignatureBlockParser**: Extracts and formats signature blocks
- **PDFLayoutEngine**: Manages page layout and breaks

## Key Design Patterns

### Output Abstraction (Task 5.2)
- **PDFOutput Interface**: Abstracts file vs buffer output
- **FileOutput**: Writes PDF to file system
- **BufferOutput**: Accumulates PDF in memory
- **Backward Compatibility**: File path strings auto-convert to FileOutput

### Progress Reporting (Task 5.3)
- **ProgressReporter Interface**: Abstracts progress updates
- **ConsoleProgressReporter**: Uses ora spinners for CLI
- **CallbackProgressReporter**: Emits events for GUI
- **NullProgressReporter**: Silent operation for tests
- **Event Types**: start, progress, complete, error, warning

### Factory Pattern (Task 5.3)
- **PDFServiceFactory**: Creates configured services
- **forCLI()**: Console reporter with spinners
- **forGUI()**: Callback reporter for UI updates
- **forTesting()**: Null reporter for silent operation
- **createPipeline()**: Complete PDF generation setup

## Testing Patterns

### Mock Management
```typescript
jest.mock('ora');
const mockSpinner = {
  start: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  // Chain-able methods
};
```

### Async Testing
```typescript
// Test duration tracking
await new Promise(resolve => setTimeout(resolve, 100));
// Assert timing measurements
```

### Error Boundaries
```typescript
// Test callback errors don't crash reporter
const errorCallback = jest.fn(() => { throw new Error(); });
expect(() => reporter.report('Test')).not.toThrow();
```

### Factory Testing
```typescript
// Test correct reporter creation
const service = PDFServiceFactory.forCLI();
expect(ConsoleProgressReporter).toHaveBeenCalled();
```

## Template System
- JSON-based template definitions
- Dynamic field population via YAML
- Signature block markers ({{SIGNATURE:id}})
- Support for 8 IP document types

## Data Flow Patterns
1. User provides YAML data and document type
2. Template loaded and fields populated
3. Agents process and enhance content
4. PDF generator creates formatted output
5. Progress reported throughout pipeline

## Error Handling
- Graceful degradation for missing data
- Detailed error logging with context
- Recovery strategies for partial failures
- User-friendly error messages

## Performance Considerations
- 6-second average document generation
- Parallel agent processing where possible
- Efficient memory usage with streaming
- Cached template and precedent data 