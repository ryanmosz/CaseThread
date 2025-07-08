# Subtask 5.6: Add --debug flag to enable verbose logging

**Part of Parent Task 5.0: Build CLI Interface with Commander**

## Overview

Implement the `--debug` flag functionality to enable verbose logging throughout the application. This flag will set the Winston logger to debug level and ensure all debug information is captured for troubleshooting purposes.

## Implementation Steps

### 1. Update index.ts to handle debug flag globally

Update `src/index.ts` to properly handle the debug flag:

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
  .option('-d, --debug', 'Enable debug logging')
  .hook('preAction', (thisCommand) => {
    // This hook runs before any command action
    const options = thisCommand.opts();
    if (options.debug) {
      logger.level = 'debug';
      logger.debug('Debug logging enabled via global flag');
      logger.debug(`Running command: ${thisCommand.args.join(' ')}`);
      logger.debug(`Node version: ${process.version}`);
      logger.debug(`Working directory: ${process.cwd()}`);
    }
  });

// Add the generate command
program.addCommand(generateCommand);

// Parse command line arguments
program.parse();
```

### 2. Update generate command to inherit debug flag

Update `src/commands/generate.ts` to also support command-level debug flag:

```typescript
interface GenerateOptions {
  output: string;
  debug?: boolean;
}

export const generateCommand = new Command('generate')
  .description('Generate a legal document from template and input data')
  .argument('<document-type>', 'Type of legal document to generate')
  .argument('<input-path>', 'Path to YAML input file')
  .option('-o, --output <path>', 'Output directory for generated document', '.')
  .option('-d, --debug', 'Enable debug logging')
  .action(async (documentType: string, inputPath: string, options: GenerateOptions) => {
    // Check for command-level debug flag
    if (options.debug && logger.level !== 'debug') {
      logger.level = 'debug';
      logger.debug('Debug logging enabled via command flag');
    }
    
    const spinner = new SpinnerWrapper(SPINNER_MESSAGES.INIT);
    const startTime = Date.now();
    
    // Log command execution details
    logger.debug('=== Generate Command Execution ===');
    logger.debug(`Document Type: ${documentType}`);
    logger.debug(`Input Path: ${inputPath}`);
    logger.debug(`Output Directory: ${options.output}`);
    logger.debug(`Debug Mode: ${options.debug || logger.level === 'debug'}`);
    logger.debug('=================================');
    
    try {
      // ... rest of the command implementation with enhanced debug logging
      
      // Add debug logs throughout the process
      const outputDir = path.resolve(options.output);
      logger.debug(`Resolved output directory: ${outputDir}`);
      
      // When checking directory
      try {
        await fs.access(outputDir);
        logger.debug(`Output directory exists: ${outputDir}`);
        spinner.updateMessage(SPINNER_MESSAGES.CHECK_PERMISSIONS);
      } catch (error) {
        logger.debug(`Output directory does not exist: ${outputDir}`, error);
        spinner.updateMessage(SPINNER_MESSAGES.CREATE_OUTPUT_DIR);
        await fs.mkdir(outputDir, { recursive: true });
        logger.debug(`Created output directory: ${outputDir}`);
      }
      
      // When loading templates
      spinner.updateMessage(SPINNER_MESSAGES.LOAD_TEMPLATE);
      logger.debug(`Loading template from: templates/core/${documentType}.json`);
      const template = await loadTemplate(documentType);
      logger.debug(`Template loaded successfully, keys: ${Object.keys(template).join(', ')}`);
      
      spinner.updateMessage(SPINNER_MESSAGES.LOAD_EXPLANATION);
      logger.debug(`Loading explanation from: templates/explanations/${documentType}-explanation.md`);
      const explanation = await loadExplanation(documentType);
      logger.debug(`Explanation loaded, length: ${explanation.length} characters`);
      
      // When parsing YAML
      spinner.updateMessage(SPINNER_MESSAGES.PARSE_YAML);
      logger.debug(`Parsing YAML file: ${inputPath}`);
      const yamlData = await parseYaml(inputPath);
      logger.debug(`YAML parsed successfully, keys: ${Object.keys(yamlData).join(', ')}`);
      
      // Before OpenAI call
      logger.debug('Preparing to call OpenAI API...');
      logger.debug(`Template sections: ${JSON.stringify(Object.keys(template), null, 2)}`);
      logger.debug(`YAML data preview: ${JSON.stringify(yamlData, null, 2).substring(0, 200)}...`);
      
      // ... continue with rest of implementation
    } catch (error) {
      logger.debug('Error occurred during generation:', error);
      handleError(error as Error, spinner);
    }
  });
```

### 3. Enhance logger configuration for debug mode

Update `src/utils/logger.ts` to ensure debug logs are properly formatted:

```typescript
import winston from 'winston';
import * as path from 'path';

const logDir = 'logs';
const debugLogFile = path.join(logDir, 'debug.log');
const errorLogFile = path.join(logDir, 'error.log');

// Create custom format for debug logs
const debugFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  
  // Add metadata if present
  if (Object.keys(meta).length > 0) {
    log += '\n' + JSON.stringify(meta, null, 2);
  }
  
  return log;
});

export const logger = winston.createLogger({
  level: 'info', // Default level
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat()
  ),
  transports: [
    // File transport for debug logs
    new winston.transports.File({
      filename: debugLogFile,
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        debugFormat
      )
    }),
    // File transport for errors
    new winston.transports.File({
      filename: errorLogFile,
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // Console transport (only shows in debug mode)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      silent: true // Will be enabled when debug flag is set
    })
  ]
});

// Helper to enable/disable console output
export function enableConsoleLogging(enable: boolean): void {
  const consoleTransport = logger.transports.find(
    t => t instanceof winston.transports.Console
  ) as winston.transports.ConsoleTransportInstance;
  
  if (consoleTransport) {
    consoleTransport.silent = !enable;
  }
}

// Update logger level and console output when level changes
const originalLevel = Object.getOwnPropertyDescriptor(logger, 'level');
Object.defineProperty(logger, 'level', {
  get() {
    return originalLevel?.get?.call(this);
  },
  set(newLevel: string) {
    originalLevel?.set?.call(this, newLevel);
    // Enable console logging when in debug mode
    enableConsoleLogging(newLevel === 'debug');
  }
});
```

### 4. Add debug logging to all services

Update services to include debug logging:

```typescript
// In src/services/template.ts
export async function loadTemplate(documentType: string): Promise<Template> {
  logger.debug(`loadTemplate called with type: ${documentType}`);
  const templatePath = path.join('templates', 'core', `${documentType}.json`);
  logger.debug(`Attempting to read template from: ${templatePath}`);
  
  try {
    const content = await fs.readFile(templatePath, 'utf-8');
    logger.debug(`Template file read successfully, size: ${content.length} bytes`);
    const template = JSON.parse(content);
    logger.debug(`Template parsed successfully, sections: ${Object.keys(template).length}`);
    return template;
  } catch (error) {
    logger.debug(`Failed to load template: ${error.message}`);
    throw error;
  }
}

// Similar debug logging should be added to:
// - src/services/yaml.ts
// - src/services/openai.ts
// - src/utils/validator.ts
```

### 5. Create comprehensive tests

Update `__tests__/index.test.ts` and create debug flag tests:

```typescript
describe('Debug Flag Functionality', () => {
  let originalLevel: string;
  let consoleLogSpy: jest.SpyInstance;
  
  beforeEach(() => {
    originalLevel = logger.level;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });
  
  afterEach(() => {
    logger.level = originalLevel;
    jest.clearAllMocks();
  });
  
  it('should enable debug logging with global --debug flag', async () => {
    process.argv = ['node', 'index.js', '--debug', 'generate', 'patent-assignment', 'test.yaml'];
    
    const mockLogger = {
      level: 'info',
      debug: jest.fn()
    };
    
    jest.doMock('../src/utils/logger', () => ({ logger: mockLogger }));
    
    await import('../src/index');
    
    expect(mockLogger.level).toBe('debug');
    expect(mockLogger.debug).toHaveBeenCalledWith('Debug logging enabled via global flag');
  });
  
  it('should enable debug logging with command-level --debug flag', async () => {
    const mockLogger = {
      level: 'info',
      debug: jest.fn()
    };
    
    jest.doMock('../../src/utils/logger', () => ({ logger: mockLogger }));
    
    const { generateCommand } = await import('../../src/commands/generate');
    
    await generateCommand.parseAsync([
      'node', 'test', 'patent-assignment', 'test.yaml', '--debug'
    ]);
    
    expect(mockLogger.level).toBe('debug');
    expect(mockLogger.debug).toHaveBeenCalledWith('Debug logging enabled via command flag');
  });
  
  it('should log detailed information in debug mode', async () => {
    logger.level = 'debug';
    
    // Setup mocks
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ sections: [] });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ data: 'test' });
    (openaiService.generateDocument as jest.Mock).mockResolvedValue('Generated');
    
    await generateCommand.parseAsync([
      'node', 'test', 'patent-assignment', 'test.yaml', '--debug'
    ]);
    
    expect(logger.debug).toHaveBeenCalledWith('=== Generate Command Execution ===');
    expect(logger.debug).toHaveBeenCalledWith('Document Type: patent-assignment');
    expect(logger.debug).toHaveBeenCalledWith('Input Path: test.yaml');
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Resolved output directory:'));
  });
  
  it('should not show debug logs when flag is not set', async () => {
    logger.level = 'info';
    const debugSpy = jest.spyOn(logger, 'debug');
    
    // Run without debug flag
    await generateCommand.parseAsync([
      'node', 'test', 'patent-assignment', 'test.yaml'
    ]);
    
    expect(logger.level).toBe('info');
    expect(debugSpy).not.toHaveBeenCalled();
  });
});
```

### 6. Manual Testing Steps

```bash
# Inside Docker container
docker exec -it casethread-dev bash

# Build the project
npm run build

# Test global debug flag
node dist/index.js --debug generate patent-assignment docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml
# Should see debug output in console and logs/debug.log

# Test command-level debug flag
node dist/index.js generate patent-assignment docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml --debug
# Should also enable debug logging

# Test debug with various error scenarios
node dist/index.js --debug generate invalid-type test.yaml
# Should show detailed error information

# Check debug log file
cat logs/debug.log
# Should contain timestamped debug entries

# Test without debug flag
node dist/index.js generate patent-assignment docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml
# Should NOT show debug output in console

# Test debug with different scenarios
node dist/index.js --debug generate patent-assignment non-existent.yaml
# Should show detailed file loading attempts

# Test help with debug
node dist/index.js --debug --help
# Should show debug logs for help command

# Run tests
npm test -- __tests__/index.test.ts
npm test -- __tests__/commands/generate.test.ts
```

## Common Pitfalls

1. **Flag inheritance**: Ensure both global and command-level flags work
2. **Logger state**: Reset logger level in tests to avoid interference
3. **Console output**: Only show console logs in debug mode
4. **File logging**: Always log to file, regardless of debug flag
5. **Performance**: Don't let debug logging slow down normal operation

## Dependencies

- Winston logger (already implemented)
- Commander.js hooks for global flag handling
- All existing services need debug log additions

## Definition of Done

- [ ] Global --debug flag sets logger to debug level
- [ ] Command-level --debug flag also works
- [ ] Debug logs appear in console when flag is set
- [ ] Debug logs always written to logs/debug.log file
- [ ] All services include appropriate debug logging
- [ ] Console remains clean when debug is not enabled
- [ ] Tests verify debug flag functionality
- [ ] Help text shows --debug option
- [ ] Debug logs include useful troubleshooting information
- [ ] No performance impact when debug is disabled 