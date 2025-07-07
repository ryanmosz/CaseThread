# Technical Implementation Guide

## 🏗️ Architecture Overview

### Phase 1: CLI Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   CLI Commands  │────▶│  TypeScript Core │────▶│   OpenAI API    │
│  (Commander.js) │     │  (Business Logic)│     │   (GPT-3.5/4)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  Local Storage  │     │  Firm Documents  │
│    (SQLite)     │     │  (Embeddings)    │
└─────────────────┘     └──────────────────┘
```

### Phase 2: GUI Integration (Later)
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Electron UI   │────▶│  TypeScript Core │────▶│   OpenAI API    │
│  (React + D3)   │     │  (Same as CLI)   │     │   (GPT-3.5/4)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## 📁 Project Structure

```
casethread/
├── src/
│   ├── cli/               # CLI commands and interface
│   │   ├── commands/      # Individual CLI commands
│   │   ├── utils/         # CLI helpers
│   │   └── index.ts       # CLI entry point
│   ├── core/              # Business logic (shared)
│   │   ├── templates/     # Document templates
│   │   ├── generation/    # OpenAI integration
│   │   └── learning/      # Firm customization
│   ├── gui/               # Electron/React (Phase 2)
│   │   ├── main/          # Electron main process
│   │   └── renderer/      # React UI
│   ├── shared/            # Shared types/utils
│   └── tests/             # Jest tests
├── templates/             # IP document templates
├── mock-data/            # Test firm data
└── docs/                 # Documentation
```

## 🔧 Core Components

### 1. CLI Commands

```typescript
// src/cli/commands/generate.ts
export const generateCommand = new Command('generate')
  .description('Generate a document from a template')
  .argument('<template>', 'Template name or path')
  .argument('<output>', 'Output file path')
  .option('-c, --context <path>', 'Firm context directory')
  .option('-i, --input <json>', 'Input data as JSON')
  .action(async (template, output, options) => {
    const generator = new DocumentGenerator(
      await getOpenAIService(),
      await loadFirmContext(options.context)
    );
    
    const result = await generator.generate(
      await loadTemplate(template),
      JSON.parse(options.input || '{}')
    );
    
    await saveDocument(result, output);
  });
```

### 2. Template Engine

```typescript
// src/core/templates/Template.ts
export interface Template {
  id: string;
  name: string;
  type: 'patent' | 'trademark' | 'license' | 'nda';
  sections: TemplateSection[];
  requiredFields: Field[];
}

export interface TemplateSection {
  id: string;
  title: string;
  content: string;
  variables: Variable[];
  firmCustomizable: boolean;
}
```

### 3. Document Generator

```typescript
// src/core/generation/DocumentGenerator.ts
export class DocumentGenerator {
  constructor(
    private openAIService: OpenAIService,
    private firmContext: FirmContext
  ) {}

  async generate(
    template: Template,
    inputs: UserInputs
  ): Promise<GeneratedDocument> {
    // 1. Extract variables from template
    // 2. Inject firm context
    // 3. Call OpenAI API with prompt
    // 4. Parse and structure response
    // 5. Return for review
  }
}
```

### 4. OpenAI Service

```typescript
// src/core/generation/OpenAIService.ts
export class OpenAIService {
  private openai: OpenAI;
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateSection(
    prompt: string,
    model: 'gpt-3.5-turbo' | 'gpt-4' = 'gpt-3.5-turbo'
  ): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, // Lower for consistency
      max_tokens: 2000
    });
    
    return completion.choices[0].message.content || '';
  }
}
```

### 5. Firm Learning System

```typescript
// src/core/learning/FirmLearner.ts
export class FirmLearner {
  async ingestDocuments(docs: FirmDocument[]): Promise<void> {
    // 1. Extract style patterns
    // 2. Identify common phrases
    // 3. Build embeddings using OpenAI
    // 4. Store in vector DB
  }

  async getRelevantContext(
    section: TemplateSection
  ): Promise<FirmContext> {
    // 1. Search similar sections
    // 2. Extract style guides
    // 3. Return contextualized prompts
  }
}
```

### 6. CLI Interface

```typescript
// src/cli/index.ts
#!/usr/bin/env node
import { Command } from 'commander';
import { generateCommand } from './commands/generate';
import { learnCommand } from './commands/learn';
import { templatesCommand } from './commands/templates';
import { configCommand } from './commands/config';

const program = new Command();

program
  .name('casethread')
  .description('CLI for IP document generation')
  .version('0.1.0');

program.addCommand(generateCommand);
program.addCommand(learnCommand);
program.addCommand(templatesCommand);
program.addCommand(configCommand);

program.parse();
```

### 7. Basic Review UI (MVP)

```typescript
// src/renderer/components/DocumentReview.tsx
// Phase 2 - GUI Implementation
export const DocumentReview: React.FC<{
  generated: GeneratedDocument;
  onExport: (format: ExportFormat) => void;
}> = ({ generated, onExport }) => {
  // Display generated document
  // Basic editing capabilities
  // Export options
};
```

### 8. Visual Diff Component (Stretch Goal)

```typescript
// src/renderer/components/DiffViewer.tsx
// STRETCH GOAL - Not included in MVP
export const DiffViewer: React.FC<{
  template: Template;
  generated: GeneratedDocument;
  onApprove: (changes: Change[]) => void;
}> = ({ template, generated, onApprove }) => {
  // Side-by-side comparison
  // Highlight changes
  // Allow inline editing
  // Track approvals
};
```

## 🧪 Testing Strategy

### Unit Tests (TDD)
```typescript
// src/tests/cli/generate.test.ts
describe('Generate Command', () => {
  it('should generate document from CLI args', async () => {
    const result = await runCLI([
      'generate',
      'patent-application',
      'output.docx',
      '--input', '{"title": "Test Patent"}'
    ]);
    
    expect(result.exitCode).toBe(0);
    expect(fs.existsSync('output.docx')).toBe(true);
  });
});
```

### Integration Tests
- CLI command flow testing
- Template → Generation → Export pipeline
- Firm document ingestion via CLI
- OpenAI API error handling
- Configuration management

## 🔐 Security & Privacy

1. **API Key Management**
   - User provides OpenAI API key via config
   - Stored in system keychain
   - Never in code or logs
   - Environment variable support

2. **Data Privacy**
   - Local storage for all documents
   - Only prompts sent to OpenAI
   - No client data in prompts
   - Clear data handling policy

3. **CLI Security**
   - Input validation on all commands
   - Path traversal protection
   - Safe JSON parsing
   - Secure file operations

## 🚀 Development Workflow

### Setup
```bash
npm install
npm run dev:cli     # Watch mode for CLI
npm test -- --watch # TDD mode
```

### CLI Development
```bash
npm link            # Link CLI globally
casethread --help   # Test CLI commands
npm run build:cli   # Build CLI
```

### GUI Development (Phase 2)
```bash
npm run dev:gui     # Start Electron + React
npm run build       # Production build
npm run package     # Create installers
```

## 📦 Dependencies

### Core
- `commander`: CLI framework
- `typescript`: Type safety
- `jest`: Testing
- `dotenv`: Environment config

### CLI Specific
- `chalk`: Terminal colors
- `ora`: Spinner for long operations
- `inquirer`: Interactive prompts
- `cli-table3`: Table output

### AI/ML
- `openai`: Official OpenAI SDK
- `tiktoken`: Token counting
- `vectra`: Local vector DB
- `natural`: Text processing

### GUI (Phase 2)
- `electron`: Desktop app framework
- `react`: UI framework
- `electron-store`: Preferences
- `tailwindcss`: Styling

## 🎯 Performance Targets

- **CLI Generation:** <30 seconds per document
- **CLI Startup:** <1 second
- **Memory:** <200MB for CLI, <500MB for GUI
- **Storage:** <1GB per firm
- **API Usage:** ~$0.02-0.05 per document (GPT-3.5) 