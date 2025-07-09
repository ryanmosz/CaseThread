# CaseThread GUI - Technical Context

## Technology Stack

### Core Technologies
- **Electron**: Desktop application framework
- **React**: UI component library
- **TypeScript**: Type-safe JavaScript development
- **Node.js**: Runtime environment (existing)

### UI Framework & Styling
- **React**: Component-based UI development
- **HeroUI**: React component library built on Tailwind CSS
- **Tailwind CSS**: Utility-first CSS framework (via HeroUI)
- **Lucide Icons**: Consistent icon library (compatible with HeroUI)
- **React-arborist**: Professional tree component for file system navigation

### State Management
- **React Context**: Global state management
- **React Hooks**: Local state management
- **Zustand** (optional): Lightweight state management

### Desktop Integration
- **Electron IPC**: Inter-process communication
- **Electron Dialog**: Native file system dialogs
- **Electron Menu**: Native menu bar integration

## Existing System Integration

### Current Tech Stack (Preserve)
- **TypeScript**: Main development language
- **Node.js**: Runtime environment
- **ChromaDB**: Vector database for document embeddings
- **OpenAI API**: AI-powered document generation
- **Docker**: Containerization and deployment

### Multi-Agent Architecture (Maintain)
- **Context Builder Agent**: Document context analysis
- **Drafting Agent**: Initial document generation
- **Overseer Agent**: Quality control and refinement
- **Orchestrator**: Agent coordination and workflow management

### CLI Integration Points
- **Generate Command**: `npm run cli -- generate <template> --input <data>`
- **Learn Command**: `npm run cli -- learn <path>`
- **Template System**: JSON-based template definitions in `/templates/core/`

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Existing CaseThread CLI setup
- Docker (for backend services)

### Development Dependencies
```json
{
  "devDependencies": {
    "@electron/forge": "^7.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "electron": "^27.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@electron/jest-preset": "^3.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### Production Dependencies
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@heroui/react": "^0.2.0",
    "tailwindcss": "^3.0.0",
    "framer-motion": "^10.0.0",
    "lucide-react": "^0.300.0",
    "clsx": "^2.0.0",
    "react-hook-form": "^7.0.0",
    "zod": "^3.0.0",
    "react-arborist": "^3.4.3"
  }
}
```



## Project Structure

### Electron-Specific Structure
```
src/
├── electron/
│   ├── main/
│   │   ├── index.ts              # Main process entry
│   │   ├── window-manager.ts     # Window management
│   │   ├── ipc-handlers.ts       # IPC communication
│   │   └── cli-bridge.ts         # CLI integration
│   ├── renderer/
│   │   ├── index.tsx             # Renderer entry
│   │   ├── App.tsx               # Main app component
│   │   └── components/
│   │       ├── DocumentBrowser.tsx
│   │       ├── TemplateSelector.tsx
│   │       ├── DocumentViewer.tsx
│   │       └── TemplateForm.tsx
│   └── preload/
│       └── index.ts              # Preload scripts
├── types/
│   └── electron.d.ts             # Electron type definitions
└── styles/
    └── globals.css               # Global styles
```

## Technical Constraints

### Performance Requirements
- **Startup Time**: < 3 seconds to application ready
- **Template Loading**: < 1 second for template list
- **Document Generation**: Maintain existing CLI performance
- **Memory Usage**: < 500MB for standard document operations

### Security Requirements
- **Sandboxed Renderer**: Disable Node.js integration in renderer
- **Context Isolation**: Enable context isolation for security
- **CSP**: Implement Content Security Policy
- **File System Access**: Restricted to project directories

### Platform Compatibility
- **Primary Target**: macOS (development environment)
- **Secondary Targets**: Windows, Linux
- **Electron Version**: 27.x (latest stable)

## Build and Distribution

### Development Build
```bash
# Start development server
npm run electron:dev

# Build for development
npm run electron:build:dev
```

### Production Build
```bash
# Build for production
npm run electron:build

# Package for distribution
npm run electron:package

# Create installer
npm run electron:make
```

### Distribution Strategy
- **Auto-updater**: Electron-builder auto-updater
- **Code Signing**: Platform-specific code signing
- **Notarization**: macOS notarization for distribution

## Integration Architecture

### CLI Command Bridge
```typescript
// Bridge pattern for CLI integration
interface CLIBridge {
  generateDocument(templateId: string, formData: FormData): Promise<GeneratedDocument>;
  learnFromPath(path: string): Promise<void>;
  getTemplateSchema(templateId: string): Promise<TemplateSchema>;
  validateFormData(templateId: string, data: FormData): Promise<ValidationResult>;
}
```

### File System Integration
```typescript
// File system watcher for mock data
interface FileSystemWatcher {
  watchPath(path: string): void;
  onFileChange(callback: (path: string) => void): void;
  getDirectoryTree(path: string): Promise<DirectoryTree>;
}
```

## Testing Strategy

### Unit Testing
- **Jest**: JavaScript testing framework
- **React Testing Library**: React component testing
- **@electron/jest-preset**: Electron-specific testing setup

### Integration Testing
- **Spectron**: End-to-end Electron testing
- **Playwright**: Cross-platform automated testing
- **Mock CLI**: Isolated GUI testing without backend

### Performance Testing
- **Electron DevTools**: Performance profiling
- **Bundle Analysis**: Package size optimization
- **Memory Profiling**: Memory usage analysis

## Error Handling

### Error Categories
1. **CLI Integration Errors**: Command execution failures
2. **Template Processing Errors**: JSON parsing and validation
3. **File System Errors**: Permission and access issues
4. **Network Errors**: OpenAI API and external service failures

### Error Handling Strategy
- **User-Friendly Messages**: Non-technical error presentation
- **Error Recovery**: Graceful degradation and retry mechanisms
- **Logging**: Comprehensive error logging for debugging
- **Fallbacks**: Alternative workflows for common failure scenarios

## Configuration Management

### Application Configuration
```typescript
interface AppConfig {
  openaiApiKey: string;
  vectorDbPath: string;
  templatePath: string;
  mockDataPath: string;
  outputPath: string;
  autoSave: boolean;
  theme: 'light' | 'dark' | 'system';
}
```

### Environment Variables
- `OPENAI_API_KEY`: OpenAI API authentication
- `VECTOR_DB_PATH`: ChromaDB database path
- `NODE_ENV`: Development/production mode
- `ELECTRON_DEBUG`: Debug mode toggle

## HeroUI Configuration

### Setup Requirements
```bash
# Install HeroUI and dependencies
npm install @heroui/react tailwindcss framer-motion
```

### Tailwind Configuration
```javascript
// tailwind.config.js
const { heroui } = require("@heroui/react");

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [heroui()],
}
```

### Theme Customization
```typescript
// HeroUI provider setup for legal software
import { HeroUIProvider } from "@heroui/react";

const legalTheme = {
  colors: {
    primary: {
      DEFAULT: "#0ea5e9",
      foreground: "#ffffff"
    },
    focus: "#0ea5e9"
  }
};

export const App = () => (
  <HeroUIProvider theme={legalTheme}>
    <MainApp />
  </HeroUIProvider>
);
```

## Future Migration Considerations

### Python + LangGraph/LangChain Transition

#### Migration Strategy
```bash
# Phase 1: Maintain CLI Interface
# - Keep existing CLI command structure
# - Replace backend implementation gradually
# - Maintain JSON template system

# Phase 2: Enhanced Agent Architecture
# - Replace TypeScript agents with Python
# - Implement LangGraph for agent orchestration
# - Better context management and memory
```

#### Architecture Compatibility
```typescript
// Current CLI Bridge Design (Migration-Ready)
interface CLIBridge {
  // Interface remains stable regardless of backend language
  generateDocument(templateId: string, formData: FormData): Promise<GeneratedDocument>;
  learnFromPath(path: string): Promise<void>;
  // Backend can be TypeScript or Python
}

// Future Python CLI Integration
interface PythonCLIBridge {
  // Same interface, different backend
  command: 'python scripts/generate.py';
  args: ['--template', templateId, '--data', formData];
  // LangGraph orchestration under the hood
}
```

#### Technical Benefits
- **Better Context Management**: LangGraph provides superior context handling
- **Enhanced Agent Control**: More sophisticated agent orchestration
- **Python AI Ecosystem**: Access to advanced ML/AI libraries
- **Memory Management**: Better conversation and document memory
- **Streaming Support**: Real-time document generation updates

#### Migration Readiness
```typescript
// Current GUI Design is Migration-Friendly
const generateDocument = async (templateId: string, formData: FormData) => {
  // Abstract CLI execution - backend agnostic
  const result = await ipcRenderer.invoke('generate-document', {
    templateId,
    formData
  });
  // GUI doesn't care if backend is TypeScript or Python
  return result;
};
```

#### Package Requirements (Future)
```json
{
  "dependencies": {
    // Current GUI dependencies remain the same
    "react": "^18.0.0",
    "@heroui/react": "^0.2.0"
    // No Python dependencies needed in GUI
  },
  "python-requirements": {
    // Future Python backend requirements
    "langchain": "^0.1.0",
    "langgraph": "^0.1.0", 
    "openai": "^1.0.0",
    "chromadb": "^0.4.0"
  }
}
``` 