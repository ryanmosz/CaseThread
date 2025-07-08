# Subtask 5.1: Create src/index.ts with shebang and Commander setup

**Part of Parent Task 5.0: Build CLI Interface with Commander**

## Overview

Create the main CLI entry point file that initializes Commander.js and sets up the basic command structure for the CaseThread POC. This file will be the starting point for all CLI operations and must be executable directly from the command line.

## Implementation Steps

### 1. Create the index.ts file

Create `src/index.ts` with proper TypeScript structure and shebang for direct execution.

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { generateCommand } from './commands/generate';
import { logger } from './utils/logger';

// Create the main program instance
const program = new Command();

// Configure the CLI program
program
  .name('casethread-poc')
  .description('CaseThread CLI Proof of Concept - Generate legal documents using AI')
  .version('0.1.0')
  .option('-d, --debug', 'Enable debug logging');

// Add the generate command
program.addCommand(generateCommand);

// Parse command line arguments
program.parse();

// Handle debug flag globally
const options = program.opts();
if (options.debug) {
  logger.level = 'debug';
  logger.debug('Debug logging enabled');
}
```

### 2. Update package.json bin field

Add the bin field to package.json to make the CLI executable:

```json
{
  "bin": {
    "casethread-poc": "./dist/index.js"
  }
}
```

### 3. Create test file

Create `__tests__/index.test.ts`:

```typescript
import { jest } from '@jest/globals';
import { Command } from 'commander';

describe('CLI Entry Point', () => {
  let originalArgv: string[];
  let mockParse: jest.SpyInstance;
  let mockExit: jest.SpyInstance;

  beforeEach(() => {
    originalArgv = process.argv;
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    process.argv = originalArgv;
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('should set up the CLI with correct name and description', async () => {
    process.argv = ['node', 'index.js', '--help'];
    
    const mockCommand = {
      name: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      version: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      addCommand: jest.fn().mockReturnThis(),
      parse: jest.fn(),
      opts: jest.fn().mockReturnValue({})
    };

    jest.doMock('commander', () => ({
      Command: jest.fn(() => mockCommand)
    }));

    await import('../src/index');

    expect(mockCommand.name).toHaveBeenCalledWith('casethread-poc');
    expect(mockCommand.description).toHaveBeenCalledWith(
      'CaseThread CLI Proof of Concept - Generate legal documents using AI'
    );
    expect(mockCommand.version).toHaveBeenCalledWith('0.1.0');
  });

  it('should add debug option', async () => {
    process.argv = ['node', 'index.js'];
    
    const mockCommand = {
      name: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      version: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      addCommand: jest.fn().mockReturnThis(),
      parse: jest.fn(),
      opts: jest.fn().mockReturnValue({})
    };

    jest.doMock('commander', () => ({
      Command: jest.fn(() => mockCommand)
    }));

    await import('../src/index');

    expect(mockCommand.option).toHaveBeenCalledWith(
      '-d, --debug',
      'Enable debug logging'
    );
  });

  it('should enable debug logging when --debug flag is used', async () => {
    process.argv = ['node', 'index.js', '--debug'];
    
    const mockLogger = {
      level: 'info',
      debug: jest.fn()
    };

    jest.doMock('../src/utils/logger', () => ({
      logger: mockLogger
    }));

    const mockCommand = {
      name: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      version: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      addCommand: jest.fn().mockReturnThis(),
      parse: jest.fn(),
      opts: jest.fn().mockReturnValue({ debug: true })
    };

    jest.doMock('commander', () => ({
      Command: jest.fn(() => mockCommand)
    }));

    await import('../src/index');

    expect(mockLogger.level).toBe('debug');
    expect(mockLogger.debug).toHaveBeenCalledWith('Debug logging enabled');
  });
});
```

### 4. Manual Testing Steps

Inside the Docker container:

```bash
# Build the project
npm run build

# Test direct execution (should show help)
node dist/index.js --help

# Test version flag
node dist/index.js --version

# Test debug flag (should see debug message in logs)
node dist/index.js --debug

# Test unknown command (should show error)
node dist/index.js unknown-command
```

### 5. Implementation Checklist

- [ ] Create src/index.ts with shebang line
- [ ] Import Commander and create program instance
- [ ] Set name, description, and version
- [ ] Add global --debug option
- [ ] Import and add generateCommand (stub for now)
- [ ] Call program.parse()
- [ ] Handle debug flag to set logger level
- [ ] Update package.json with bin field
- [ ] Create comprehensive unit tests
- [ ] Test all command line variations manually
- [ ] Ensure proper exit codes

## Common Pitfalls

1. **Missing shebang**: Without `#!/usr/bin/env node`, the file won't be executable
2. **Import order**: Ensure logger is imported before using it
3. **Mock cleanup**: Tests must properly reset mocks to avoid interference
4. **Process.argv**: Tests need to manipulate process.argv carefully
5. **Exit codes**: Commander handles exit codes, don't call process.exit directly

## Dependencies

- Commander.js (already installed)
- Logger utility (already implemented)
- Generate command (to be implemented in 5.2)

## Definition of Done

- [ ] src/index.ts created with proper shebang
- [ ] Commander program configured with name, description, version
- [ ] Global --debug flag implemented and tested
- [ ] Unit tests pass with good coverage
- [ ] Manual testing confirms all flags work
- [ ] npm run build succeeds
- [ ] Can run `node dist/index.js --help` successfully 