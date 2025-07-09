# CaseThread GUI - System Patterns

## Architecture Overview

### Three-Pane Desktop Pattern
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Menu Bar] File Edit View Generate Help                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Left Pane]        │ [Middle Pane - Viewer]      │ [Right Pane]            │
│ Documents          │                              │ Template Selector       │
│ ├── attorneys/     │                              │                         │
│ │   ├── sarah-chen/ │                              │ ┌─ Patent Documents ─┐ │
│ │   │   ├── clients/│                              │ │ □ Provisional Patent│ │
│ │   │   │   └── ... │                              │ │ □ Patent Assignment │ │
│ │   └── michael-r.. │                              │ │ □ Patent License    │ │
│ ├── firm-profile..  │                              │ │ □ Office Action Resp│ │
│ └── templates/      │                              │ └─────────────────────┘ │
│     └── core/       │                              │                         │
│                     │                              │ ┌─ Trademark Docs ───┐ │
│                     │                              │ │ □ Trademark App     │ │
│                     │                              │ └─────────────────────┘ │
│                     │                              │                         │
│                     │                              │ ┌─ Business Docs ────┐ │
│                     │                              │ │ □ NDA (IP-Specific) │ │
│                     │                              │ │ □ Tech Transfer     │ │
│                     │                              │ │ □ Cease & Desist    │ │
│                     │                              │ └─────────────────────┘ │
│                     │                              │                         │
│                     │                              │ [Generate] [Cancel]    │
├─────────────────────┴──────────────────────────────┴─────────────────────────┤
│ [Status Bar] Ready | Vector DB: Connected | Last Generated: 2024-01-15     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Design Patterns

### 1. Model-View-Controller (MVC) Pattern
- **Model**: Existing CLI business logic and data structures
- **View**: Electron renderer process with React components
- **Controller**: IPC bridge between GUI and CLI functionality

### 2. Observer Pattern for State Management
- Template selection state
- Form validation state
- Document generation progress
- File system watching for document updates

### 3. Command Pattern for CLI Integration
- Encapsulate CLI commands as objects
- Enable undo/redo functionality
- Provide command history and logging

### 4. Factory Pattern for Template Processing
- Dynamic form generation based on template schema
- Template-specific validation rules
- Consistent field rendering across templates

### 5. HeroUI Design System Integration
- Consistent component library across all UI elements
- Built-in Tailwind CSS utilities for custom styling
- Professional legal software appearance
- Responsive design with mobile-first approach

### 6. Backend-Agnostic Architecture (Future-Ready)
- CLI interface abstraction for backend flexibility
- Template system independence from agent implementation
- IPC communication layer supports multiple backend languages
- Modular design enables TypeScript → Python migration

## Component Architecture

### Core Components

#### 1. DocumentBrowser (Left Pane)
```typescript
interface DocumentBrowserProps {
  rootPath: string; // "/mock-data"
  onDocumentSelect: (doc: Document) => void;
  onFolderExpand: (path: string) => void;
}

// Using HeroUI components: Tree, Card, Spacer
// Styled with Tailwind classes via HeroUI
```

#### 2. TemplateSelector (Right Pane)
```typescript
interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplate: Template | null;
  onTemplateSelect: (template: Template) => void;
  onGenerate: (formData: FormData) => void;
}

// Using HeroUI components: Listbox, Card, Button, Divider
// Grouped template categories with clean visual hierarchy
```

#### 3. DocumentViewer (Middle Pane)
```typescript
interface DocumentViewerProps {
  document: GeneratedDocument | null;
  loading: boolean;
  error: string | null;
  onExport: (format: 'pdf' | 'docx' | 'md') => void;
}

// Using HeroUI components: Card, Spinner, Dropdown, Button
// Markdown rendering with HeroUI typography styles
```

#### 4. TemplateForm (Modal)
```typescript
interface TemplateFormProps {
  template: Template;
  isOpen: boolean;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  validation: ValidationState;
}

// Using HeroUI components: Modal, Input, Textarea, Select, Button
// Form validation with HeroUI error states and styling
```

## Data Flow Architecture

### 1. Template Loading Flow
```
App Start → Load Templates from /templates/core → Parse JSON Schemas → Generate Form Definitions → Cache in State
```

### 2. Document Generation Flow
```
Template Selection → Form Modal → Field Validation → Generate Button → IPC to Main Process → CLI Command Execution → Result Display
```

### 3. File System Integration
```
Static Mock Data → File System Watcher → Tree View Updates → Document Preview → Context Loading
```

## Integration Patterns

### IPC (Inter-Process Communication) Bridge
```typescript
// Main Process API
interface MainProcessAPI {
  generateDocument: (templateId: string, formData: FormData) => Promise<GeneratedDocument>;
  loadTemplate: (templateId: string) => Promise<Template>;
  watchFileSystem: (path: string) => void;
  getDocumentTree: () => Promise<DocumentTree>;
}
```

### CLI Command Integration
```typescript
// Command execution pattern (Backend-Agnostic)
const executeGenerate = async (templateId: string, formData: FormData) => {
  // Abstract command execution - supports future Python migration
  const command = await getGenerateCommand(templateId, formData);
  return await exec(command);
};

// Current TypeScript CLI
const getGenerateCommand = (templateId: string, formData: FormData) => {
  return `npm run cli -- generate ${templateId} --input ${JSON.stringify(formData)}`;
};

// Future Python CLI (same interface)
const getPythonGenerateCommand = (templateId: string, formData: FormData) => {
  return `python scripts/generate.py --template ${templateId} --data ${JSON.stringify(formData)}`;
};
```

## State Management Patterns

### Local Component State
- Form validation states
- UI visibility states
- Loading and error states

### Global Application State
- Selected template
- Generated document
- File system tree
- Application configuration

## Error Handling Patterns

### 1. Progressive Error Boundaries
- Component-level error boundaries
- Global error fallback
- User-friendly error messages

### 2. Validation Chain Pattern
- Field-level validation
- Form-level validation
- Server-side validation echo

### 3. Graceful Degradation
- Fallback for missing templates
- Offline mode handling
- Performance optimization under load

## Security Patterns

### File System Access
- Sandboxed file operations
- Restricted path access
- Validation of file inputs

### Command Execution
- Sanitized CLI arguments
- Process isolation
- Output validation

## Performance Patterns

### Lazy Loading
- Template definitions loaded on demand
- Document preview rendering optimization
- Virtual scrolling for large document lists

### Caching Strategy
- Template schema caching
- Generated document caching
- File system metadata caching

## HeroUI Integration Patterns

### Theme Configuration
```typescript
// HeroUI theme customization for legal software
const legalTheme = {
  colors: {
    primary: {
      50: '#f0f9ff',
      500: '#0ea5e9',
      900: '#0c4a6e'
    },
    secondary: {
      50: '#f8fafc',
      500: '#64748b',
      900: '#0f172a'
    }
  },
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace']
  }
};
```

### Component Styling Patterns
```typescript
// Consistent legal document styling
const documentStyles = {
  card: "bg-white border border-gray-200 rounded-lg shadow-sm",
  header: "text-lg font-semibold text-gray-900",
  text: "text-sm text-gray-600",
  button: "bg-blue-600 hover:bg-blue-700 text-white"
};
```

### Form Field Mapping
```typescript
// Template field type to HeroUI component mapping
const fieldComponentMap = {
  text: Input,
  textarea: Textarea,
  select: Select,
  checkbox: Checkbox,
  date: DatePicker,
  number: Input
};
``` 