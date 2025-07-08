# Subtask 5.2: Implement src/commands/generate.ts with document type and input path arguments

**Part of Parent Task 5.0: Build CLI Interface with Commander**

## Overview

Create the generate command handler that accepts document type and input YAML path as required arguments. This command will orchestrate the entire document generation process by calling the appropriate services in sequence.

## Implementation Steps

### 1. Create commands directory and generate.ts file

Create `src/commands/generate.ts`:

```typescript
import { Command } from 'commander';
import { SpinnerWrapper } from '../utils/spinner';
import { logger } from '../utils/logger';
import { isValidDocumentType, SUPPORTED_TYPES } from '../utils/validator';
import { loadTemplate, loadExplanation } from '../services/template';
import { parseYaml } from '../services/yaml';
import { generateDocument } from '../services/openai';
import { promises as fs } from 'fs';
import * as path from 'path';

export const generateCommand = new Command('generate')
  .description('Generate a legal document from template and input data')
  .argument('<document-type>', 'Type of legal document to generate')
  .argument('<input-path>', 'Path to YAML input file')
  .action(async (documentType: string, inputPath: string) => {
    const spinner = new SpinnerWrapper('Initializing...');
    
    try {
      // Step 1: Validate document type
      spinner.updateMessage('Validating document type...');
      logger.debug(`Validating document type: ${documentType}`);
      
      if (!isValidDocumentType(documentType)) {
        throw new Error(
          `Invalid document type: ${documentType}\n` +
          `Supported types: ${SUPPORTED_TYPES.join(', ')}`
        );
      }
      
      // Step 2: Load template files
      spinner.updateMessage('Loading template files...');
      logger.debug(`Loading template for type: ${documentType}`);
      
      const template = await loadTemplate(documentType);
      const explanation = await loadExplanation(documentType);
      
      // Step 3: Load and validate YAML
      spinner.updateMessage('Validating input data...');
      logger.debug(`Loading YAML from: ${inputPath}`);
      
      const yamlData = await parseYaml(inputPath);
      
      // Step 4: Generate document via OpenAI
      spinner.updateMessage('Connecting to OpenAI...');
      spinner.updateMessage('Generating document (this may take 30-60 seconds)...');
      
      const generatedDocument = await generateDocument(
        template,
        explanation,
        yamlData
      );
      
      // Document saving will be handled in subtask 5.7
      spinner.succeed('Document generated successfully!');
      
      // Temporary: Output to console until 5.7 implements file saving
      console.log('\n--- Generated Document ---\n');
      console.log(generatedDocument);
      
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      logger.error('Document generation failed:', error);
      process.exit(1);
    }
  });
```

### 2. Create test file

Create `__tests__/commands/generate.test.ts`:

```typescript
import { generateCommand } from '../../src/commands/generate';
import { SpinnerWrapper } from '../../src/utils/spinner';
import { logger } from '../../src/utils/logger';
import * as validator from '../../src/utils/validator';
import * as templateService from '../../src/services/template';
import * as yamlService from '../../src/services/yaml';
import * as openaiService from '../../src/services/openai';

// Mock all dependencies
jest.mock('../../src/utils/spinner');
jest.mock('../../src/utils/logger');
jest.mock('../../src/utils/validator');
jest.mock('../../src/services/template');
jest.mock('../../src/services/yaml');
jest.mock('../../src/services/openai');

describe('Generate Command', () => {
  let mockSpinner: any;
  let mockExit: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Setup spinner mock
    mockSpinner = {
      updateMessage: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn()
    };
    (SpinnerWrapper as jest.MockedClass<typeof SpinnerWrapper>)
      .mockImplementation(() => mockSpinner);

    // Setup process.exit mock
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Setup console.log spy
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // Setup logger mock
    (logger.debug as jest.Mock).mockImplementation();
    (logger.error as jest.Mock).mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should have correct command structure', () => {
    expect(generateCommand.name()).toBe('generate');
    expect(generateCommand.description()).toBe('Generate a legal document from template and input data');
    expect(generateCommand.args.length).toBe(2);
    expect(generateCommand.args[0].name()).toBe('document-type');
    expect(generateCommand.args[1].name()).toBe('input-path');
  });

  it('should successfully generate a document with valid inputs', async () => {
    // Setup mocks
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation content');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    (openaiService.generateDocument as jest.Mock).mockResolvedValue('Generated document content');

    // Execute command
    await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);

    // Verify flow
    expect(mockSpinner.updateMessage).toHaveBeenCalledWith('Validating document type...');
    expect(validator.isValidDocumentType).toHaveBeenCalledWith('patent-assignment');
    
    expect(mockSpinner.updateMessage).toHaveBeenCalledWith('Loading template files...');
    expect(templateService.loadTemplate).toHaveBeenCalledWith('patent-assignment');
    expect(templateService.loadExplanation).toHaveBeenCalledWith('patent-assignment');
    
    expect(mockSpinner.updateMessage).toHaveBeenCalledWith('Validating input data...');
    expect(yamlService.parseYaml).toHaveBeenCalledWith('test.yaml');
    
    expect(mockSpinner.updateMessage).toHaveBeenCalledWith('Generating document (this may take 30-60 seconds)...');
    expect(openaiService.generateDocument).toHaveBeenCalledWith(
      { template: 'data' },
      'explanation content',
      { yaml: 'data' }
    );
    
    expect(mockSpinner.succeed).toHaveBeenCalledWith('Document generated successfully!');
    expect(consoleLogSpy).toHaveBeenCalledWith('Generated document content');
  });

  it('should handle invalid document type', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(false);
    (validator.SUPPORTED_TYPES as any) = ['patent-assignment', 'nda'];

    try {
      await generateCommand.parseAsync(['node', 'test', 'invalid-type', 'test.yaml']);
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).toBe('process.exit called');
    }

    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringContaining('Invalid document type: invalid-type')
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle template loading error', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockRejectedValue(
      new Error('Template not found')
    );

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).toBe('process.exit called');
    }

    expect(mockSpinner.fail).toHaveBeenCalledWith('Error: Template not found');
    expect(logger.error).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle YAML parsing error', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockRejectedValue(
      new Error('Invalid YAML format')
    );

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).toBe('process.exit called');
    }

    expect(mockSpinner.fail).toHaveBeenCalledWith('Error: Invalid YAML format');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle OpenAI generation error', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    (openaiService.generateDocument as jest.Mock).mockRejectedValue(
      new Error('API rate limit exceeded')
    );

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).toBe('process.exit called');
    }

    expect(mockSpinner.fail).toHaveBeenCalledWith('Error: API rate limit exceeded');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
```

### 3. Create commands directory test

Create `__tests__/commands/index.test.ts` to ensure directory exports:

```typescript
describe('Commands Directory', () => {
  it('should export generateCommand', () => {
    const commands = require('../../src/commands/generate');
    expect(commands.generateCommand).toBeDefined();
    expect(commands.generateCommand.name()).toBe('generate');
  });
});
```

### 4. Manual Testing Steps

```bash
# Inside Docker container
docker exec -it casethread-dev bash

# Build the project
npm run build

# Test with valid inputs (using mock data files)
node dist/index.js generate patent-assignment docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml

# Test with invalid document type
node dist/index.js generate invalid-type test.yaml

# Test with non-existent file
node dist/index.js generate patent-assignment non-existent.yaml

# Test command help
node dist/index.js generate --help

# Run tests
npm test -- __tests__/commands/generate.test.ts
```

## Common Pitfalls

1. **Async command action**: Ensure the action handler is async
2. **Error handling**: Always catch errors and exit with code 1
3. **Spinner state**: Ensure spinner.fail() is called before process.exit
4. **Import paths**: Use relative imports consistently
5. **Mock reset**: Clear all mocks between tests

## Dependencies

- All services are already implemented (template, yaml, openai, validator, spinner, logger)
- Commander.js for command structure
- File saving will be implemented in subtask 5.7

## Definition of Done

- [ ] src/commands/generate.ts created
- [ ] Command accepts two required arguments
- [ ] Validates document type using existing validator
- [ ] Loads template and explanation using existing service
- [ ] Parses YAML using existing service
- [ ] Generates document using OpenAI service
- [ ] Shows spinner updates at each step
- [ ] Handles all error cases gracefully
- [ ] Comprehensive unit tests with high coverage
- [ ] Manual testing confirms all scenarios work
- [ ] Temporary console output until file saving is implemented 