# CaseThread Tech Stack

## Overview
This document outlines the technology stack used for CaseThread, a TypeScript-based application featuring both a command-line interface and an Electron GUI for generating legal documents using OpenAI's API.

## Core Technologies

### Runtime Environment
- **Node.js** (v20 LTS) - JavaScript runtime
- **TypeScript** (v5.x) - Type-safe JavaScript superset
- **Docker** (Alpine Linux) - Containerized development environment
- **Electron** (v37.x) - Cross-platform desktop application framework

### Development Environment
- **Docker Compose** - Multi-container orchestration
- **Nodemon** - Auto-reload during development
- **ts-node** - Direct TypeScript execution
- **Vite** - Fast build tool for frontend development
- **Electron Forge** - Electron application tooling

## Dependencies

### CLI Framework
- **Commander.js** (v11.x) - Command-line interface framework
  - Handles argument parsing
  - Provides help generation
  - Manages subcommands

### GUI Framework
- **React** (v19.x) - User interface library
  - Component-based architecture
  - Virtual DOM for efficient updates
  - Hooks for state management
- **React Arborist** (v3.x) - Tree view component for file explorer
- **Tailwind CSS** (v3.x) - Utility-first CSS framework
  - Rapid UI development
  - Responsive design utilities
  - Custom component styling
- **Hero UI** (v2.x) - React component library
- **Heroicons** (v2.x) - Icon library

### AI Integration
- **OpenAI SDK** (v4.x) - Official OpenAI API client
  - Model: 'o3'
  - Temperature: 0.2
  - Non-streaming responses
- **LangChain/Langgraph** (v0.3.x) - Multi-agent workflow orchestration
  - Quality pipeline implementation
  - 3-agent refinement system
  - Iterative document improvement
- **ChromaDB** (via LangChain) - Vector database for precedents
  - Document embeddings
  - Similarity search
  - Context retrieval

### File Processing
- **js-yaml** (v4.x) - YAML parsing and validation
- **fs/promises** - Native Node.js file system operations

### PDF Generation
- **PDFKit** (v0.17.x) - JavaScript PDF generation library
  - Pure JavaScript implementation
  - No system dependencies required
  - Built-in font support (Times-Roman)
  - Programmatic PDF creation
  - Letter size support
  - Custom margins and spacing
  - Page numbering capabilities
  - Buffer-based generation for preview

### User Interface Components
- **Ora** (v7.x) - Terminal spinner for progress indication
- **Chalk** (v5.x) - Terminal string styling
- **Background Generation Status** - Custom component for long operations
- **AI Assistant** - Chat-based document editing interface
- **Enhanced Document Viewer** - Multi-mode document display

### Build Tools
- **Vite** (v6.x) - Frontend build tool
  - Hot module replacement
  - Fast development server
  - Optimized production builds
- **Electron Forge** (v7.x) - Electron packaging
  - Cross-platform installers
  - Auto-update support
  - Code signing capabilities

### Logging & Configuration
- **Winston** (v3.x) - Logging framework
  - Debug logs to file
  - Errors to console
- **Dotenv** (v16.x) - Environment variable management

### Testing
- **Jest** (v29.x) - Testing framework
- **ts-jest** (v29.x) - TypeScript preprocessor for Jest
- **@types/jest** - TypeScript definitions
- **React Testing Library** - Component testing
- **Spectron/Playwright** - E2E testing for Electron

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript Compiler** (tsc) - Build tool
- **PostCSS** - CSS processing for Tailwind

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
- `PDFServiceFactory.ts` - PDF service creation

### PDF Generation Layer
PDF creation separated into modular services:
- `LegalPDFGenerator.ts` - Main PDF generation logic
- `DocumentFormatter.ts` - Formatting rules by document type
- `SignatureBlockParser.ts` - Signature marker parsing
- `PDFLayoutEngine.ts` - Layout and positioning logic
- `PDFExportService.ts` - Orchestration and buffer support

### Multi-Agent Architecture
Quality assurance through agent pipeline:
- **ContextBuilderAgent** - Gathers relevant precedents
- **DraftingAgent** - Initial document generation
- **OverseerAgent** - Quality review and feedback
- **QualityPipelineWorkflow** (Langgraph) - Orchestrates agent collaboration

### IPC Communication
Electron main/renderer process separation:
- Main process handles file operations and PDF generation
- Renderer process manages UI and user interactions
- IPC handlers for secure communication

### Error Handling
Centralized error handling with user-friendly messages and detailed debug logs.

## File Structure
```
/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── commands/             # CLI commands
│   ├── services/             # Business logic
│   │   └── pdf/              # PDF generation services
│   ├── agents/               # AI agents
│   │   └── langgraph/        # Langgraph workflows
│   ├── electron/             # Electron application
│   │   ├── main/             # Main process
│   │   ├── preload/          # Preload scripts
│   │   └── renderer/         # React application
│   │       └── src/
│   │           └── components/ # React components
│   ├── utils/                # Utilities
│   └── types/                # TypeScript types
├── __tests__/                # Test files
├── templates/                # Document templates
├── docs/                     # Documentation
├── Dockerfile                # Container definition
├── docker-compose.yml        # Container orchestration
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── tailwind.config.js        # Tailwind configuration
├── vite.*.config.ts          # Vite configurations
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
- PDF/A archival format support
- Digital signature integration
- Advanced PDF features (bookmarks, forms)

### Scalability
- Microservice architecture ready
- Queue-based processing possible
- Horizontal scaling via containers 