# Product Requirements Document: Parent Task 3.0 - Implement Core Services

## Introduction/Overview

Parent task 3.0 focuses on implementing the foundational service layer for the CaseThread CLI POC. This task creates the core services that handle template loading, YAML parsing, logging, and validation - essential components that all other parts of the application will depend on. These services form the backbone of the document generation pipeline, ensuring data integrity and providing consistent interfaces for higher-level components.

## Goals

1. Create a robust type system that defines all data structures used throughout the application
2. Implement comprehensive input validation to catch errors early in the process
3. Build a flexible logging system for debugging and operational monitoring
4. Develop services for loading and processing templates and explanations
5. Create a YAML parsing service with thorough field validation
6. Implement a user-friendly progress indicator for long-running operations
7. Establish patterns for error handling and reporting across all services

## User Stories

1. **As a developer**, I want strongly-typed interfaces so that I can catch type errors at compile time and have better IDE support.

2. **As a CLI user**, I want clear validation errors so that I know exactly what's wrong with my input and how to fix it.

3. **As a developer**, I want comprehensive logging so that I can debug issues in production and understand system behavior.

4. **As a CLI user**, I want to see real-time progress updates so that I know the system is working during long operations.

5. **As a developer**, I want reusable service modules so that I can easily integrate template and YAML functionality throughout the application.

6. **As a system operator**, I want structured error handling so that I can monitor and respond to issues effectively.

## Functional Requirements

1. **Type System (types/index.ts)**
   - The system must define TypeScript interfaces for DocumentType, YamlData, and Template
   - The system must export type guards for runtime type checking
   - The system must include all necessary subtypes for template sections, fields, and metadata

2. **Validator Utility (utils/validator.ts)**
   - The system must validate document types against the 8 supported types from templates/core/
   - The system must export a SUPPORTED_TYPES constant array
   - The system must provide an isValidDocumentType function that returns boolean

3. **Logger Utility (utils/logger.ts)**
   - The system must create a Winston logger with both file and console transports
   - The system must support debug, info, warn, and error log levels
   - The system must write debug logs to the path specified in DEBUG_LOG_PATH environment variable
   - The system must format console logs with colors and timestamps
   - The system must format file logs as JSON for parsing

4. **Template Service (services/template.ts)**
   - The system must load JSON template files from templates/core/ directory
   - The system must load explanation markdown files from templates/explanations/ directory
   - The system must validate loaded templates against the expected schema
   - The system must handle missing files with clear error messages
   - The system must return parsed template objects and explanation content

5. **YAML Service (services/yaml.ts)**
   - The system must parse YAML files using js-yaml library
   - The system must validate parsed YAML against template required fields
   - The system must provide detailed validation errors for missing or invalid fields
   - The system must handle malformed YAML with helpful error messages
   - The system must return typed YamlData objects

6. **Spinner Utility (utils/spinner.ts)**
   - The system must wrap the Ora library for progress indication
   - The system must provide an updateMessage method to change spinner text
   - The system must support success, fail, and warning states
   - The system must handle non-TTY environments gracefully

7. **Error Handling**
   - All services must throw typed errors with descriptive messages
   - All services must log errors before throwing
   - All services must provide context about what was being attempted

## Non-Goals (Out of Scope)

1. Caching of loaded templates (can be added later for optimization)
2. Template schema migrations or versioning
3. YAML schema generation from templates
4. Internationalization of error messages
5. Remote template loading
6. Template validation beyond basic structure
7. Complex YAML transformations or computed fields

## Design Considerations

### Type Architecture
```typescript
// Core types that other components will use
interface DocumentType {
  id: string;
  name: string;
  templateFile: string;
  explanationFile: string;
}

interface YamlData {
  client: string;
  attorney: string;
  document_type: string;
  template: string;
  [key: string]: any; // Document-specific fields
}

interface Template {
  id: string;
  name: string;
  type: string;
  version: string;
  requiredFields: TemplateField[];
  sections: TemplateSection[];
  // ... other fields from schema
}
```

### Service Interfaces
- All services should be stateless and export pure functions
- Services should not depend on each other directly
- Error handling should be consistent across all services

## Technical Considerations

1. **File System Access**: All file operations must use absolute paths resolved from the project root
2. **Docker Environment**: Services must work within the Docker container's file system
3. **TypeScript Strict Mode**: All code must compile with strict TypeScript settings
4. **Testing**: Services must be easily mockable for unit testing
5. **Performance**: Template loading should complete in under 100ms
6. **Memory**: Services should not hold large objects in memory unnecessarily

## Success Metrics

1. All TypeScript interfaces compile without errors
2. Validator correctly identifies all 8 valid document types
3. Logger creates both console and file outputs successfully
4. Template service loads all 8 templates without errors
5. YAML service validates all test scenario files correctly
6. Spinner displays updates in TTY environments
7. All unit tests pass with >90% code coverage
8. No runtime type errors when used by other components

## Open Questions

1. Should we implement template caching in this phase or defer to optimization phase?
2. Do we need to support custom template directories or only templates/core/?
3. Should the logger support log rotation or rely on external tools?
4. Do we need to validate template variables match the document's expected structure?
5. Should we support YAML includes or references for complex documents? 