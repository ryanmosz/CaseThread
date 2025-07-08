# Subtask 5.5: Implement error handling with user-friendly messages and exit codes

**Part of Parent Task 5.0: Build CLI Interface with Commander**

## Overview

Implement comprehensive error handling throughout the CLI to provide user-friendly error messages and appropriate exit codes. This includes catching all possible errors, formatting them appropriately, and ensuring the application exits cleanly with meaningful status codes.

## Implementation Steps

### 1. Define error types and messages

Create `src/types/errors.ts`:

```typescript
export enum ErrorCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  INVALID_ARGUMENTS = 2,
}

export interface ErrorMessages {
  INVALID_TYPE: (type: string, supported: string[]) => string;
  FILE_NOT_FOUND: (path: string) => string;
  TEMPLATE_NOT_FOUND: (type: string) => string;
  INVALID_YAML: (details: string) => string;
  MISSING_YAML_FIELDS: (fields: string[]) => string;
  OPENAI_ERROR: (details: string) => string;
  NETWORK_ERROR: () => string;
  PERMISSION_ERROR: (path: string) => string;
  UNKNOWN_ERROR: () => string;
}

export const ERROR_MESSAGES: ErrorMessages = {
  INVALID_TYPE: (type, supported) => 
    `Invalid document type: '${type}'\n\n` +
    `Supported document types:\n${supported.map(t => `  • ${t}`).join('\n')}\n\n` +
    `Example: casethread-poc generate patent-assignment input.yaml`,
    
  FILE_NOT_FOUND: (path) =>
    `File not found: '${path}'\n\n` +
    `Please check that the file exists and the path is correct.\n` +
    `Try using an absolute path or ensure you're in the right directory.`,
    
  TEMPLATE_NOT_FOUND: (type) =>
    `Template files not found for document type: '${type}'\n\n` +
    `Expected files:\n` +
    `  • templates/core/${type}.json\n` +
    `  • templates/explanations/${type}-explanation.md\n\n` +
    `Please ensure template files are properly installed.`,
    
  INVALID_YAML: (details) =>
    `Invalid YAML format in input file:\n\n${details}\n\n` +
    `Please check your YAML syntax. Common issues:\n` +
    `  • Incorrect indentation (use spaces, not tabs)\n` +
    `  • Missing colons after keys\n` +
    `  • Unclosed quotes`,
    
  MISSING_YAML_FIELDS: (fields) =>
    `Missing required fields in YAML input:\n\n` +
    `Required fields:\n${fields.map(f => `  • ${f}`).join('\n')}\n\n` +
    `Please add these fields to your input file and try again.`,
    
  OPENAI_ERROR: (details) =>
    `OpenAI API error:\n\n${details}\n\n` +
    `Possible solutions:\n` +
    `  • Check your API key is valid (OPENAI_API_KEY in .env)\n` +
    `  • Verify you have API credits available\n` +
    `  • Try again in a few moments if rate limited`,
    
  NETWORK_ERROR: () =>
    `Network connection error\n\n` +
    `Unable to connect to OpenAI API. Please check:\n` +
    `  • Your internet connection is working\n` +
    `  • No firewall/proxy blocking the connection\n` +
    `  • OpenAI services are operational`,
    
  PERMISSION_ERROR: (path) =>
    `Permission denied: '${path}'\n\n` +
    `Unable to write to the specified location. Please check:\n` +
    `  • You have write permissions for the directory\n` +
    `  • The directory is not read-only\n` +
    `  • Try using a different output directory with --output`,
    
  UNKNOWN_ERROR: () =>
    `An unexpected error occurred\n\n` +
    `Please try again or check the debug logs for more information.\n` +
    `Run with --debug flag to see detailed error information.`
};
```

### 2. Create error handler utility

Create `src/utils/error-handler.ts`:

```typescript
import { SpinnerWrapper } from './spinner';
import { logger } from './logger';
import { ERROR_MESSAGES, ErrorCode } from '../types/errors';

export class CLIError extends Error {
  constructor(
    message: string,
    public code: ErrorCode = ErrorCode.GENERAL_ERROR,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export function handleError(error: Error, spinner: SpinnerWrapper): never {
  // Log full error details
  logger.error('Full error details:', error);
  
  let userMessage: string;
  let exitCode: ErrorCode;
  
  // Determine error type and format message
  if (error instanceof CLIError) {
    userMessage = error.message;
    exitCode = error.code;
  } else if (error.message.includes('ENOENT')) {
    const match = error.message.match(/ENOENT.*'([^']+)'/);
    const path = match ? match[1] : 'unknown file';
    userMessage = ERROR_MESSAGES.FILE_NOT_FOUND(path);
    exitCode = ErrorCode.GENERAL_ERROR;
  } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
    const match = error.message.match(/['"]([^'"]+)['"]/);
    const path = match ? match[1] : 'unknown location';
    userMessage = ERROR_MESSAGES.PERMISSION_ERROR(path);
    exitCode = ErrorCode.GENERAL_ERROR;
  } else if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
    userMessage = ERROR_MESSAGES.NETWORK_ERROR();
    exitCode = ErrorCode.GENERAL_ERROR;
  } else if (error.message.includes('Invalid API Key') || error.message.includes('Unauthorized')) {
    userMessage = ERROR_MESSAGES.OPENAI_ERROR('Invalid API key provided');
    exitCode = ErrorCode.GENERAL_ERROR;
  } else if (error.message.includes('rate limit')) {
    userMessage = ERROR_MESSAGES.OPENAI_ERROR('Rate limit exceeded. Please wait and try again.');
    exitCode = ErrorCode.GENERAL_ERROR;
  } else {
    // For unknown errors, show the original message if not in debug mode
    userMessage = logger.level === 'debug' 
      ? `${ERROR_MESSAGES.UNKNOWN_ERROR()}\n\nDebug info: ${error.message}`
      : ERROR_MESSAGES.UNKNOWN_ERROR();
    exitCode = ErrorCode.GENERAL_ERROR;
  }
  
  // Update spinner with error
  spinner.fail(userMessage);
  
  // Exit with appropriate code
  process.exit(exitCode);
}

// Helper to create formatted errors
export function createError(
  type: keyof typeof ERROR_MESSAGES,
  ...args: any[]
): CLIError {
  const messageFunc = ERROR_MESSAGES[type];
  const message = typeof messageFunc === 'function' 
    ? (messageFunc as any)(...args)
    : messageFunc;
  
  return new CLIError(message);
}
```

### 3. Update generate command with error handling

Update `src/commands/generate.ts`:

```typescript
import { handleError, createError, CLIError } from '../utils/error-handler';
import { ErrorCode } from '../types/errors';

export const generateCommand = new Command('generate')
  .description('Generate a legal document from template and input data')
  .argument('<document-type>', 'Type of legal document to generate')
  .argument('<input-path>', 'Path to YAML input file')
  .option('-o, --output <path>', 'Output directory for generated document', '.')
  .action(async (documentType: string, inputPath: string, options: GenerateOptions) => {
    const spinner = new SpinnerWrapper(SPINNER_MESSAGES.INIT);
    const startTime = Date.now();
    
    try {
      // Validate output directory
      const outputDir = path.resolve(options.output);
      logger.debug(`Output directory set to: ${outputDir}`);
      
      try {
        await fs.access(outputDir);
        spinner.updateMessage(SPINNER_MESSAGES.CHECK_PERMISSIONS);
      } catch {
        spinner.updateMessage(SPINNER_MESSAGES.CREATE_OUTPUT_DIR);
        try {
          await fs.mkdir(outputDir, { recursive: true });
        } catch (mkdirError) {
          throw createError('PERMISSION_ERROR', outputDir);
        }
      }
      
      // Check write permissions
      try {
        await fs.access(outputDir, fs.constants.W_OK);
      } catch {
        throw createError('PERMISSION_ERROR', outputDir);
      }
      
      // Validate document type
      spinner.updateMessage(SPINNER_MESSAGES.VALIDATE_TYPE);
      logger.debug(`Validating document type: ${documentType}`);
      
      if (!isValidDocumentType(documentType)) {
        throw createError('INVALID_TYPE', documentType, SUPPORTED_TYPES);
      }
      
      // Load template files
      spinner.updateMessage(SPINNER_MESSAGES.LOAD_TEMPLATE);
      logger.debug(`Loading template for type: ${documentType}`);
      
      let template, explanation;
      try {
        template = await loadTemplate(documentType);
      } catch (error) {
        if (error.message.includes('ENOENT')) {
          throw createError('TEMPLATE_NOT_FOUND', documentType);
        }
        throw error;
      }
      
      spinner.updateMessage(SPINNER_MESSAGES.LOAD_EXPLANATION);
      try {
        explanation = await loadExplanation(documentType);
      } catch (error) {
        if (error.message.includes('ENOENT')) {
          throw createError('TEMPLATE_NOT_FOUND', documentType);
        }
        throw error;
      }
      
      // Parse and validate YAML
      spinner.updateMessage(SPINNER_MESSAGES.PARSE_YAML);
      logger.debug(`Loading YAML from: ${inputPath}`);
      
      let yamlData;
      try {
        yamlData = await parseYaml(inputPath);
      } catch (error) {
        if (error.message.includes('ENOENT')) {
          throw createError('FILE_NOT_FOUND', inputPath);
        } else if (error.message.includes('YAMLException')) {
          throw createError('INVALID_YAML', error.message);
        } else if (error.message.includes('Missing required fields')) {
          // Extract field names from error
          const fields = error.message.match(/Missing required fields: (.+)/)?.[1]?.split(', ') || [];
          throw createError('MISSING_YAML_FIELDS', fields);
        }
        throw error;
      }
      
      spinner.updateMessage(SPINNER_MESSAGES.VALIDATE_YAML);
      
      // Generate document
      spinner.updateMessage(SPINNER_MESSAGES.PREPARE_PROMPT);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      spinner.updateMessage(SPINNER_MESSAGES.CONNECT_OPENAI);
      
      const genStartTime = Date.now();
      spinner.updateMessage(SPINNER_MESSAGES.GENERATE_DOC);
      
      const updateInterval = setInterval(() => {
        const elapsed = Math.round((Date.now() - genStartTime) / 1000);
        spinner.updateMessage(`${SPINNER_MESSAGES.GENERATE_DOC} (${elapsed}s elapsed)`);
      }, 5000);
      
      let generatedDocument;
      try {
        generatedDocument = await generateDocument(template, explanation, yamlData);
        clearInterval(updateInterval);
      } catch (error) {
        clearInterval(updateInterval);
        
        // Handle specific OpenAI errors
        if (error.message.includes('API key')) {
          throw createError('OPENAI_ERROR', 'Invalid or missing API key');
        } else if (error.message.includes('rate limit')) {
          throw createError('OPENAI_ERROR', 'Rate limit exceeded');
        } else if (error.message.includes('fetch failed')) {
          throw createError('NETWORK_ERROR');
        }
        
        throw error;
      }
      
      // Success!
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      spinner.succeed(`${SPINNER_MESSAGES.SUCCESS} (completed in ${totalTime}s)`);
      
      logger.debug(`Document will be saved to: ${outputDir}`);
      
      // Temporary output
      console.log(`\n--- Generated Document (will be saved to ${outputDir}) ---\n`);
      console.log(generatedDocument);
      
      process.exit(ErrorCode.SUCCESS);
      
    } catch (error) {
      handleError(error as Error, spinner);
    }
  });
```

### 4. Update tests for error handling

Update `__tests__/commands/generate.test.ts`:

```typescript
import { ERROR_MESSAGES, ErrorCode } from '../../src/types/errors';
import { CLIError, createError } from '../../src/utils/error-handler';

describe('Generate Command - Error Handling', () => {
  let mockSpinner: any;
  let mockExit: jest.SpyInstance;

  beforeEach(() => {
    // Existing setup...
    mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit called with code ${code}`);
    });
  });

  it('should show user-friendly message for invalid document type', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(false);
    (validator.SUPPORTED_TYPES as any) = ['patent-assignment', 'nda-ip-specific'];

    try {
      await generateCommand.parseAsync(['node', 'test', 'invalid-type', 'test.yaml']);
      fail('Should have thrown');
    } catch (error) {
      expect(error.message).toContain('process.exit called with code 1');
    }

    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringContaining('Invalid document type: \'invalid-type\'')
    );
    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringContaining('• patent-assignment')
    );
  });

  it('should show user-friendly message for file not found', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({});
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('');
    (yamlService.parseYaml as jest.Mock).mockRejectedValue(
      new Error('ENOENT: no such file or directory, open \'non-existent.yaml\'')
    );

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'non-existent.yaml']);
      fail('Should have thrown');
    } catch (error) {
      expect(error.message).toContain('process.exit called with code 1');
    }

    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringContaining('File not found: \'non-existent.yaml\'')
    );
  });

  it('should show user-friendly message for template not found', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockRejectedValue(
      new Error('ENOENT: no such file or directory')
    );

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);
      fail('Should have thrown');
    } catch (error) {
      expect(error.message).toContain('process.exit called with code 1');
    }

    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringContaining('Template files not found for document type: \'patent-assignment\'')
    );
  });

  it('should show user-friendly message for invalid YAML', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({});
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('');
    (yamlService.parseYaml as jest.Mock).mockRejectedValue(
      new Error('YAMLException: bad indentation of a mapping entry at line 3')
    );

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'bad.yaml']);
      fail('Should have thrown');
    } catch (error) {
      expect(error.message).toContain('process.exit called with code 1');
    }

    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringContaining('Invalid YAML format')
    );
    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringContaining('bad indentation')
    );
  });

  it('should show user-friendly message for missing YAML fields', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({});
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('');
    (yamlService.parseYaml as jest.Mock).mockRejectedValue(
      new Error('Missing required fields: assignor_name, assignee_name, patent_title')
    );

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'incomplete.yaml']);
      fail('Should have thrown');
    } catch (error) {
      expect(error.message).toContain('process.exit called with code 1');
    }

    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringContaining('Missing required fields')
    );
    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringContaining('• assignor_name')
    );
  });

  it('should show user-friendly message for OpenAI API errors', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({});
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({});
    (openaiService.generateDocument as jest.Mock).mockRejectedValue(
      new Error('Invalid API Key provided')
    );

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);
      fail('Should have thrown');
    } catch (error) {
      expect(error.message).toContain('process.exit called with code 1');
    }

    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringContaining('OpenAI API error')
    );
    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringContaining('Check your API key')
    );
  });

  it('should show user-friendly message for network errors', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({});
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({});
    (openaiService.generateDocument as jest.Mock).mockRejectedValue(
      new Error('fetch failed: ECONNREFUSED')
    );

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);
      fail('Should have thrown');
    } catch (error) {
      expect(error.message).toContain('process.exit called with code 1');
    }

    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringContaining('Network connection error')
    );
  });

  it('should exit with code 0 on success', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({});
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({});
    (openaiService.generateDocument as jest.Mock).mockResolvedValue('Generated');

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);
      fail('Should have thrown');
    } catch (error) {
      expect(error.message).toContain('process.exit called with code 0');
    }
  });
});
```

### 5. Manual Testing Steps

```bash
# Inside Docker container
docker exec -it casethread-dev bash

# Build the project
npm run build

# Test various error scenarios

# Invalid document type
node dist/index.js generate invalid-type test.yaml
# Should show supported types list

# Non-existent file
node dist/index.js generate patent-assignment /path/to/nowhere.yaml
# Should show file not found with helpful message

# Invalid YAML syntax
echo "bad: yaml: : syntax:" > bad.yaml
node dist/index.js generate patent-assignment bad.yaml
# Should show YAML syntax error details

# Missing required fields
echo "incomplete: true" > incomplete.yaml
node dist/index.js generate patent-assignment incomplete.yaml
# Should list missing required fields

# Permission denied
mkdir -p /tmp/readonly
chmod 444 /tmp/readonly
node dist/index.js generate patent-assignment test.yaml --output /tmp/readonly
# Should show permission error with suggestions

# Invalid API key (set bad key in .env)
echo "OPENAI_API_KEY=invalid-key" > .env
node dist/index.js generate patent-assignment docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml
# Should show API key error with instructions

# Network error (disconnect network if possible)
# Should show network error with troubleshooting steps

# Success case
node dist/index.js generate patent-assignment docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml
echo $?  # Should be 0

# Error case
node dist/index.js generate invalid-type test.yaml
echo $?  # Should be 1

# Run tests
npm test -- __tests__/commands/generate.test.ts
```

## Common Pitfalls

1. **Exit code consistency**: Always use defined ErrorCode enum
2. **Error message formatting**: Keep messages helpful and actionable
3. **Debug info**: Only show technical details in debug mode
4. **Error propagation**: Catch at appropriate levels, not too early
5. **Process.exit in tests**: Mock properly to avoid test runner exit

## Dependencies

- Error types and messages defined in new files
- All existing services and utilities
- Commander.js error handling integration

## Definition of Done

- [ ] Error types and codes defined in enum
- [ ] User-friendly error messages for all scenarios
- [ ] Error handler utility created
- [ ] All errors caught and formatted appropriately
- [ ] Exit codes match Unix conventions (0=success, 1=error)
- [ ] Debug mode shows additional error details
- [ ] Unit tests cover all error scenarios
- [ ] Manual testing confirms helpful error messages
- [ ] No unhandled promise rejections or exceptions 