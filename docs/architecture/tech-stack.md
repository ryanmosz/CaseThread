# CaseThread CLI POC Tech Stack

## Overview
This document outlines the technology stack used for the CaseThread CLI proof of concept, a TypeScript-based command-line tool for generating legal documents using OpenAI's API.

## Core Technologies

### Runtime Environment
- **Node.js** (v20 LTS) - JavaScript runtime
- **TypeScript** (v5.x) - Type-safe JavaScript superset
- **Docker** (Alpine Linux) - Containerized development environment

### Development Environment
- **Docker Compose** - Multi-container orchestration
- **Nodemon** - Auto-reload during development
- **ts-node** - Direct TypeScript execution

## Dependencies

### CLI Framework
- **Commander.js** (v11.x) - Command-line interface framework
  - Handles argument parsing
  - Provides help generation
  - Manages subcommands

### AI Integration
- **OpenAI SDK** (v4.x) - Official OpenAI API client
  - Model: 'o3'
  - Temperature: 0.2
  - Non-streaming responses

### File Processing
- **js-yaml** (v4.x) - YAML parsing and validation
- **fs/promises** - Native Node.js file system operations

### User Interface
- **Ora** (v7.x) - Terminal spinner for progress indication
- **Chalk** (v5.x) - Terminal string styling

### Logging & Configuration
- **Winston** (v3.x) - Logging framework
  - Debug logs to file
  - Errors to console
- **Dotenv** (v16.x) - Environment variable management

### Testing
- **Jest** (v29.x) - Testing framework
- **ts-jest** (v29.x) - TypeScript preprocessor for Jest
- **@types/jest** - TypeScript definitions

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript Compiler** (tsc) - Build tool

## Architecture Patterns

### Dependency Injection
Services are injected rather than imported directly, enabling easier testing.

### Command Pattern
Each CLI command is encapsulated in its own module following Commander.js patterns.

### Service Layer
Business logic separated into services:
- `openai.ts` - AI integration
- `template.ts` - Template management
- `yaml.ts` - Data parsing

### Error Handling
Centralized error handling with user-friendly messages and detailed debug logs.

## File Structure
```
/
├── src/
│   ├── index.ts              # Entry point
│   ├── commands/             # CLI commands
│   ├── services/             # Business logic
│   ├── utils/                # Utilities
│   └── types/                # TypeScript types
├── __tests__/                # Test files
├── templates/                # Document templates
├── docs/                     # Documentation
├── Dockerfile                # Container definition
├── docker-compose.yml        # Container orchestration
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
└── jest.config.js            # Test configuration
```

## Development Workflow

### Container-Based Development
All development occurs within Docker containers to ensure consistency:
```bash
docker-compose up -d          # Start environment
docker exec -it casethread-poc /bin/bash  # Enter container
npm run dev                   # Start development
```

### Testing Strategy
- Unit tests for individual services
- Integration tests for full workflows
- All tests run in Docker container
- Coverage reports generated

### Build Process
1. TypeScript compilation to JavaScript
2. Output to `dist/` directory
3. Production-ready bundling

## Security Considerations

### API Keys
- Stored in `.env` file (not committed)
- Accessed via environment variables
- Never logged or exposed

### Input Validation
- Document type validation
- YAML schema validation
- Path sanitization

### Error Handling
- Sensitive data stripped from errors
- User-friendly error messages
- Detailed debug logs (local only)

## Performance Considerations

### Non-Streaming API Calls
Due to 'o3' model limitations:
- Progress spinner during API calls
- Timeout handling
- Retry logic for failures

### File I/O
- Asynchronous operations
- Stream processing for large files
- Proper resource cleanup

## Future Considerations

### Potential Upgrades
- Streaming support when available
- Additional LLM providers
- Batch processing
- Web interface

### Scalability
- Microservice architecture ready
- Queue-based processing possible
- Horizontal scaling via containers 