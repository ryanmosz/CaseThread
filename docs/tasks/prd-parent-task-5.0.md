# Product Requirements Document: Parent Task 5.0 - Build CLI Interface with Commander

## Introduction/Overview

Parent Task 5.0 focuses on building the command-line interface (CLI) that serves as the primary user interaction point for the CaseThread legal document generation tool. This task integrates all previously implemented services (template loading, YAML parsing, OpenAI integration) into a cohesive, user-friendly command-line application using Commander.js. The CLI will provide clear command structure, helpful progress indicators, robust error handling, and flexible output options.

## Goals

1. Create an intuitive CLI interface that accepts document type and input file arguments
2. Provide real-time progress feedback using terminal spinners during document generation
3. Implement comprehensive error handling with user-friendly messages
4. Enable flexible output directory specification and debug logging options
5. Generate timestamped output files with clear naming conventions
6. Ensure the CLI is production-ready with proper exit codes and help documentation

## User Stories

1. **As a legal professional**, I want to generate a patent assignment document by running `casethread-poc generate patent-assignment input.yaml`, so that I can quickly create standardized legal documents.

2. **As a user**, I want to see real-time progress updates during document generation, so that I know the system is working and approximately how long to wait.

3. **As a user**, I want to specify a custom output directory using `--output ./my-docs/`, so that I can organize generated documents according to my workflow.

4. **As a developer**, I want to enable debug logging with `--debug`, so that I can troubleshoot issues when document generation fails.

5. **As a user**, I want clear error messages when I provide invalid inputs, so that I can quickly correct my mistakes and retry.

6. **As a new user**, I want to run `casethread-poc --help` to see available commands and options, so that I can learn how to use the tool.

## Functional Requirements

1. **FR-1**: The system must create a CLI entry point at `src/index.ts` with proper shebang (`#!/usr/bin/env node`) for direct execution.

2. **FR-2**: The system must implement a `generate` command that accepts two required arguments: `<document-type>` and `<input-yaml-path>`.

3. **FR-3**: The system must validate the document type against supported types before processing (using existing validator service).

4. **FR-4**: The system must provide an `--output` flag to specify custom output directory, defaulting to current directory if not specified.

5. **FR-5**: The system must provide a `--debug` flag to enable verbose logging to the Winston logger.

6. **FR-6**: The system must display spinner updates at each stage of document generation:
   - Validating document type
   - Loading template files
   - Validating input data
   - Connecting to OpenAI
   - Generating document
   - Saving output

7. **FR-7**: The system must handle errors gracefully with user-friendly messages and appropriate exit codes:
   - Exit code 0: Success
   - Exit code 1: General error
   - Exit code 2: Invalid arguments

8. **FR-8**: The system must generate output files with timestamp-based naming: `[document-type]-[YYYY-MM-DD-HHMMSS].md`.

9. **FR-9**: The system must integrate all existing services (template, YAML, OpenAI, logger, validator, spinner) through the generate command.

10. **FR-10**: The system must provide comprehensive help text through Commander.js for all commands and options.

## Non-Goals (Out of Scope)

1. Implementing new document types beyond those already supported
2. Adding authentication or user management
3. Creating a web interface or GUI
4. Implementing batch processing of multiple files
5. Adding document preview functionality
6. Implementing custom template creation through CLI
7. Adding cost estimation display (already logged internally)
8. Supporting streaming responses (o3 model limitation)

## Design Considerations

### Command Structure
```bash
casethread-poc generate <document-type> <input-yaml-path> [options]
  Options:
    -o, --output <path>  Output directory (default: ".")
    -d, --debug          Enable debug logging
    -h, --help           Display help for command
```

### Integration Architecture
The CLI layer acts as a thin orchestration layer that:
- Parses and validates user input
- Coordinates service calls in the correct sequence
- Manages user feedback through spinner updates
- Handles errors and provides appropriate user messaging

### Error Message Strategy
- Invalid document type: Show list of supported types
- File not found: Display the path that was attempted
- Missing YAML fields: List specific required fields
- API errors: Show simplified message, log full details
- Network errors: Suggest checking connection and retrying

## Technical Considerations

### Docker Integration
All CLI commands will run inside the Docker container, accessed via:
```bash
docker exec casethread-dev npm run cli -- generate patent-assignment test.yaml
```

### Service Dependencies
The CLI will depend on these existing services:
- `validator.ts` - Document type validation
- `template.ts` - Template and explanation loading
- `yaml.ts` - YAML parsing and validation
- `openai.ts` - Document generation
- `spinner.ts` - Progress indication
- `logger.ts` - Debug logging

### File System Operations
- Use `fs.promises` for all file operations
- Ensure output directory exists before writing
- Handle permission errors gracefully
- Use absolute paths internally

## Success Metrics

1. **Command Execution**: Successfully generates documents for all supported types
2. **Error Handling**: All error scenarios produce helpful messages without stack traces
3. **Performance**: Spinner updates provide smooth user experience during API calls
4. **Testing**: 100% code coverage for CLI command logic
5. **Usability**: New users can successfully generate a document using only `--help` output
6. **Reliability**: Proper exit codes allow for scripting and automation

## Open Questions

1. Should we add a `--version` flag to display the CLI version? (Yes, Commander provides this automatically)
2. Should we validate the output directory permissions before starting generation? (Yes, fail fast principle)
3. Should we add a confirmation prompt for overwriting existing files? (No, follow Unix philosophy of no surprises)
4. Should debug logs include the full OpenAI prompt? (Already handled by OpenAI service logging)

## Next Steps

After completing Task 5.0, the following becomes possible:

1. **Task 6.0**: Create comprehensive test suite
   - End-to-end CLI testing
   - Integration tests with all services
   - Mock file system for testing
   - GitHub Actions CI/CD setup

2. **Future Enhancements**:
   - Add `list-types` command to show supported document types
   - Implement `validate` command for checking YAML without generation
   - Add progress bar with time estimates
   - Create `config` command for managing API keys
   - Add support for custom output formats (PDF, DOCX) 