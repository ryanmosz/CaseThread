# Subtask 5.3: Add --output flag for custom output directory with default to current directory

**Part of Parent Task 5.0: Build CLI Interface with Commander**

## Overview

Enhance the generate command to accept an optional `--output` flag that allows users to specify a custom directory for saving generated documents. The flag should default to the current directory if not specified.

## Implementation Steps

### 1. Update generate command with output option

Modify `src/commands/generate.ts` to add the output option:

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

interface GenerateOptions {
  output: string;
}

export const generateCommand = new Command('generate')
  .description('Generate a legal document from template and input data')
  .argument('<document-type>', 'Type of legal document to generate')
  .argument('<input-path>', 'Path to YAML input file')
  .option('-o, --output <path>', 'Output directory for generated document', '.')
  .action(async (documentType: string, inputPath: string, options: GenerateOptions) => {
    const spinner = new SpinnerWrapper('Initializing...');
    
    try {
      // Validate and resolve output directory
      const outputDir = path.resolve(options.output);
      logger.debug(`Output directory set to: ${outputDir}`);
      
      // Verify output directory exists or can be created
      try {
        await fs.access(outputDir);
      } catch {
        // Directory doesn't exist, try to create it
        spinner.updateMessage(`Creating output directory: ${outputDir}`);
        await fs.mkdir(outputDir, { recursive: true });
      }
      
      // Verify write permissions
      try {
        await fs.access(outputDir, fs.constants.W_OK);
      } catch {
        throw new Error(`No write permission for output directory: ${outputDir}`);
      }
      
      // Rest of the existing validation and generation code...
      spinner.updateMessage('Validating document type...');
      logger.debug(`Validating document type: ${documentType}`);
      
      if (!isValidDocumentType(documentType)) {
        throw new Error(
          `Invalid document type: ${documentType}\n` +
          `Supported types: ${SUPPORTED_TYPES.join(', ')}`
        );
      }
      
      // Load template files
      spinner.updateMessage('Loading template files...');
      logger.debug(`Loading template for type: ${documentType}`);
      
      const template = await loadTemplate(documentType);
      const explanation = await loadExplanation(documentType);
      
      // Load and validate YAML
      spinner.updateMessage('Validating input data...');
      logger.debug(`Loading YAML from: ${inputPath}`);
      
      const yamlData = await parseYaml(inputPath);
      
      // Generate document via OpenAI
      spinner.updateMessage('Connecting to OpenAI...');
      spinner.updateMessage('Generating document (this may take 30-60 seconds)...');
      
      const generatedDocument = await generateDocument(
        template,
        explanation,
        yamlData
      );
      
      // Store output directory for use in subtask 5.7
      // For now, just log it
      logger.debug(`Document will be saved to: ${outputDir}`);
      
      spinner.succeed('Document generated successfully!');
      
      // Temporary: Output to console and show where it will be saved
      console.log(`\n--- Generated Document (will be saved to ${outputDir}) ---\n`);
      console.log(generatedDocument);
      
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      logger.error('Document generation failed:', error);
      process.exit(1);
    }
  });
```

### 2. Update test file for output option

Update `__tests__/commands/generate.test.ts` to test the output option:

```typescript
// Add fs mock at the top with other mocks
jest.mock('fs/promises');

// Import fs for mocking
import { promises as fs } from 'fs';

// Add these test cases to the existing test suite
describe('Generate Command - Output Option', () => {
  let mockSpinner: any;
  let mockExit: jest.SpyInstance;

  beforeEach(() => {
    // ... existing setup ...
    
    // Setup fs mocks
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
  });

  it('should have output option with default value', () => {
    const outputOption = generateCommand.options.find(opt => opt.long === '--output');
    expect(outputOption).toBeDefined();
    expect(outputOption?.short).toBe('-o');
    expect(outputOption?.defaultValue).toBe('.');
    expect(outputOption?.description).toBe('Output directory for generated document');
  });

  it('should use current directory when output not specified', async () => {
    // Setup successful mocks
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    (openaiService.generateDocument as jest.Mock).mockResolvedValue('Generated content');

    await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);

    expect(logger.debug).toHaveBeenCalledWith('Output directory set to: ' + path.resolve('.'));
  });

  it('should use custom output directory when specified', async () => {
    // Setup successful mocks
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    (openaiService.generateDocument as jest.Mock).mockResolvedValue('Generated content');

    await generateCommand.parseAsync([
      'node', 'test', 'patent-assignment', 'test.yaml', 
      '--output', './my-documents'
    ]);

    expect(logger.debug).toHaveBeenCalledWith(
      'Output directory set to: ' + path.resolve('./my-documents')
    );
  });

  it('should create output directory if it does not exist', async () => {
    // Setup directory not found error
    (fs.access as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));
    
    // Setup successful mocks
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    (openaiService.generateDocument as jest.Mock).mockResolvedValue('Generated content');

    await generateCommand.parseAsync([
      'node', 'test', 'patent-assignment', 'test.yaml',
      '--output', './new-dir'
    ]);

    expect(fs.mkdir).toHaveBeenCalledWith(
      path.resolve('./new-dir'),
      { recursive: true }
    );
    expect(mockSpinner.updateMessage).toHaveBeenCalledWith(
      expect.stringContaining('Creating output directory')
    );
  });

  it('should fail if output directory has no write permission', async () => {
    // First access succeeds (directory exists)
    (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
    // Second access fails (no write permission)
    (fs.access as jest.Mock).mockRejectedValueOnce(new Error('EACCES'));

    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);

    try {
      await generateCommand.parseAsync([
        'node', 'test', 'patent-assignment', 'test.yaml',
        '--output', '/read-only-dir'
      ]);
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).toBe('process.exit called');
    }

    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringContaining('No write permission for output directory')
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should accept both short and long form of output option', async () => {
    // Setup successful mocks
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    (openaiService.generateDocument as jest.Mock).mockResolvedValue('Generated content');

    // Test short form
    await generateCommand.parseAsync([
      'node', 'test', 'patent-assignment', 'test.yaml',
      '-o', './short-form'
    ]);

    expect(logger.debug).toHaveBeenCalledWith(
      'Output directory set to: ' + path.resolve('./short-form')
    );
  });
});
```

### 3. Manual Testing Steps

```bash
# Inside Docker container
docker exec -it casethread-dev bash

# Build the project
npm run build

# Test default output (current directory)
node dist/index.js generate patent-assignment docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml

# Test custom output directory (existing)
mkdir -p ./output
node dist/index.js generate patent-assignment docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml --output ./output

# Test custom output directory (non-existing)
node dist/index.js generate patent-assignment docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml --output ./new-output

# Test short form
node dist/index.js generate patent-assignment docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml -o ./short-form

# Test read-only directory (should fail gracefully)
mkdir -p /tmp/readonly
chmod 444 /tmp/readonly
node dist/index.js generate patent-assignment docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml --output /tmp/readonly

# Test help to see option
node dist/index.js generate --help

# Run tests
npm test -- __tests__/commands/generate.test.ts
```

## Common Pitfalls

1. **Path resolution**: Always use `path.resolve()` to handle relative paths
2. **Directory permissions**: Check both existence and write permissions
3. **Recursive creation**: Use `{ recursive: true }` for mkdir
4. **Type safety**: Define interface for command options
5. **Error messages**: Provide clear feedback about directory issues

## Dependencies

- Node.js fs/promises module for file system operations
- Path module for path resolution
- Existing command structure from 5.2

## Definition of Done

- [ ] --output option added to generate command
- [ ] Option has short form (-o) and long form (--output)
- [ ] Default value is current directory ('.')
- [ ] Output directory is validated for existence
- [ ] Non-existent directories are created automatically
- [ ] Write permissions are verified
- [ ] Path is resolved to absolute form
- [ ] Unit tests cover all scenarios
- [ ] Manual testing confirms directory handling
- [ ] Help text shows the new option 