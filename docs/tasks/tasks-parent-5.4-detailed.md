# Subtask 5.4: Integrate spinner updates throughout the generation process

**Part of Parent Task 5.0: Build CLI Interface with Commander**

## Overview

Enhance the generate command to provide detailed spinner updates at each stage of the document generation process. This gives users real-time feedback about what the system is doing, especially important during the long OpenAI API call.

## Implementation Steps

### 1. Define spinner messages and timing

Update `src/commands/generate.ts` with detailed spinner messages:

```typescript
// Add at the top of generate.ts
const SPINNER_MESSAGES = {
  INIT: 'Initializing...',
  VALIDATE_TYPE: 'Validating document type...',
  CREATE_OUTPUT_DIR: 'Creating output directory...',
  CHECK_PERMISSIONS: 'Checking directory permissions...',
  LOAD_TEMPLATE: 'Loading document template...',
  LOAD_EXPLANATION: 'Loading template explanation...',
  PARSE_YAML: 'Parsing input data...',
  VALIDATE_YAML: 'Validating input data...',
  PREPARE_PROMPT: 'Preparing AI prompt...',
  CONNECT_OPENAI: 'Connecting to OpenAI...',
  GENERATE_DOC: 'Generating document (this may take 30-60 seconds)...',
  SAVE_DOC: 'Saving document...',
  SUCCESS: 'Document generated successfully!'
};

// Update the action handler with more granular spinner updates
export const generateCommand = new Command('generate')
  .description('Generate a legal document from template and input data')
  .argument('<document-type>', 'Type of legal document to generate')
  .argument('<input-path>', 'Path to YAML input file')
  .option('-o, --output <path>', 'Output directory for generated document', '.')
  .action(async (documentType: string, inputPath: string, options: GenerateOptions) => {
    const spinner = new SpinnerWrapper(SPINNER_MESSAGES.INIT);
    const startTime = Date.now();
    
    try {
      // Step 1: Validate output directory
      const outputDir = path.resolve(options.output);
      logger.debug(`Output directory set to: ${outputDir}`);
      
      try {
        await fs.access(outputDir);
        spinner.updateMessage(SPINNER_MESSAGES.CHECK_PERMISSIONS);
      } catch {
        spinner.updateMessage(SPINNER_MESSAGES.CREATE_OUTPUT_DIR);
        await fs.mkdir(outputDir, { recursive: true });
      }
      
      // Check write permissions
      try {
        await fs.access(outputDir, fs.constants.W_OK);
      } catch {
        throw new Error(`No write permission for output directory: ${outputDir}`);
      }
      
      // Step 2: Validate document type
      spinner.updateMessage(SPINNER_MESSAGES.VALIDATE_TYPE);
      logger.debug(`Validating document type: ${documentType}`);
      
      if (!isValidDocumentType(documentType)) {
        throw new Error(
          `Invalid document type: ${documentType}\n` +
          `Supported types: ${SUPPORTED_TYPES.join(', ')}`
        );
      }
      
      // Step 3: Load template files with individual updates
      spinner.updateMessage(SPINNER_MESSAGES.LOAD_TEMPLATE);
      logger.debug(`Loading template for type: ${documentType}`);
      const template = await loadTemplate(documentType);
      
      spinner.updateMessage(SPINNER_MESSAGES.LOAD_EXPLANATION);
      const explanation = await loadExplanation(documentType);
      
      // Step 4: Parse and validate YAML
      spinner.updateMessage(SPINNER_MESSAGES.PARSE_YAML);
      logger.debug(`Loading YAML from: ${inputPath}`);
      const yamlData = await parseYaml(inputPath);
      
      spinner.updateMessage(SPINNER_MESSAGES.VALIDATE_YAML);
      // YAML validation happens inside parseYaml, this is just for visual feedback
      
      // Step 5: Generate document with detailed progress
      spinner.updateMessage(SPINNER_MESSAGES.PREPARE_PROMPT);
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for visual feedback
      
      spinner.updateMessage(SPINNER_MESSAGES.CONNECT_OPENAI);
      
      // Add timestamp to long-running message
      const genStartTime = Date.now();
      spinner.updateMessage(SPINNER_MESSAGES.GENERATE_DOC);
      
      // Optionally update spinner during generation (if supported)
      const updateInterval = setInterval(() => {
        const elapsed = Math.round((Date.now() - genStartTime) / 1000);
        spinner.updateMessage(`${SPINNER_MESSAGES.GENERATE_DOC} (${elapsed}s elapsed)`);
      }, 5000);
      
      try {
        const generatedDocument = await generateDocument(
          template,
          explanation,
          yamlData
        );
        
        clearInterval(updateInterval);
        
        // Success!
        const totalTime = Math.round((Date.now() - startTime) / 1000);
        spinner.succeed(`${SPINNER_MESSAGES.SUCCESS} (completed in ${totalTime}s)`);
        
        // Store for subtask 5.7
        logger.debug(`Document will be saved to: ${outputDir}`);
        
        // Temporary output
        console.log(`\n--- Generated Document (will be saved to ${outputDir}) ---\n`);
        console.log(generatedDocument);
        
      } catch (error) {
        clearInterval(updateInterval);
        throw error;
      }
      
    } catch (error) {
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      spinner.fail(`Error: ${error.message} (failed after ${totalTime}s)`);
      logger.error('Document generation failed:', error);
      process.exit(1);
    }
  });
```

### 2. Create spinner message constants type

Add to `src/types/index.ts`:

```typescript
// Add spinner message type for type safety
export interface SpinnerMessages {
  INIT: string;
  VALIDATE_TYPE: string;
  CREATE_OUTPUT_DIR: string;
  CHECK_PERMISSIONS: string;
  LOAD_TEMPLATE: string;
  LOAD_EXPLANATION: string;
  PARSE_YAML: string;
  VALIDATE_YAML: string;
  PREPARE_PROMPT: string;
  CONNECT_OPENAI: string;
  GENERATE_DOC: string;
  SAVE_DOC: string;
  SUCCESS: string;
}
```

### 3. Update tests for spinner messages

Update `__tests__/commands/generate.test.ts`:

```typescript
// Add timer mock
jest.useFakeTimers();

describe('Generate Command - Spinner Updates', () => {
  let mockSpinner: any;
  let mockSetInterval: jest.SpyInstance;
  let mockClearInterval: jest.SpyInstance;

  beforeEach(() => {
    // Existing setup...
    mockSetInterval = jest.spyOn(global, 'setInterval');
    mockClearInterval = jest.spyOn(global, 'clearInterval');
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should show all spinner messages in correct order', async () => {
    // Setup all mocks for success
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    (openaiService.generateDocument as jest.Mock).mockResolvedValue('Generated content');

    await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);

    // Verify spinner messages in order
    const updateCalls = mockSpinner.updateMessage.mock.calls.map(call => call[0]);
    
    expect(updateCalls).toContain('Validating document type...');
    expect(updateCalls).toContain('Loading document template...');
    expect(updateCalls).toContain('Loading template explanation...');
    expect(updateCalls).toContain('Parsing input data...');
    expect(updateCalls).toContain('Validating input data...');
    expect(updateCalls).toContain('Preparing AI prompt...');
    expect(updateCalls).toContain('Connecting to OpenAI...');
    expect(updateCalls).toContain('Generating document (this may take 30-60 seconds)...');
    
    // Verify final success message includes timing
    expect(mockSpinner.succeed).toHaveBeenCalledWith(
      expect.stringMatching(/Document generated successfully! \(completed in \d+s\)/)
    );
  });

  it('should update spinner with elapsed time during generation', async () => {
    // Setup mocks
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    
    // Make generateDocument take time
    (openaiService.generateDocument as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('Generated'), 15000))
    );

    const promise = generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);

    // Fast-forward time to trigger interval updates
    jest.advanceTimersByTime(5000);
    expect(mockSpinner.updateMessage).toHaveBeenCalledWith(
      expect.stringMatching(/Generating document.*\(5s elapsed\)/)
    );

    jest.advanceTimersByTime(5000);
    expect(mockSpinner.updateMessage).toHaveBeenCalledWith(
      expect.stringMatching(/Generating document.*\(10s elapsed\)/)
    );

    // Complete the generation
    jest.runAllTimers();
    await promise;

    expect(mockClearInterval).toHaveBeenCalled();
  });

  it('should show appropriate message when creating output directory', async () => {
    // Directory doesn't exist
    (fs.access as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));
    
    // Setup other mocks
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    (openaiService.generateDocument as jest.Mock).mockResolvedValue('Generated');

    await generateCommand.parseAsync([
      'node', 'test', 'patent-assignment', 'test.yaml',
      '--output', './new-dir'
    ]);

    expect(mockSpinner.updateMessage).toHaveBeenCalledWith('Creating output directory...');
  });

  it('should include timing in error message', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockRejectedValue(
      new Error('Template not found')
    );

    // Mock Date.now to control timing
    const mockNow = jest.spyOn(Date, 'now');
    mockNow.mockReturnValueOnce(1000); // Start time
    mockNow.mockReturnValueOnce(3500); // End time (2.5 seconds later)

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);
      fail('Should have thrown');
    } catch {
      // Expected
    }

    expect(mockSpinner.fail).toHaveBeenCalledWith(
      'Error: Template not found (failed after 3s)'
    );
  });

  it('should clear interval on error during generation', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    (openaiService.generateDocument as jest.Mock).mockRejectedValue(
      new Error('API error')
    );

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);
      fail('Should have thrown');
    } catch {
      // Expected
    }

    expect(mockSetInterval).toHaveBeenCalled();
    expect(mockClearInterval).toHaveBeenCalled();
  });
});
```

### 4. Manual Testing Steps

```bash
# Inside Docker container
docker exec -it casethread-dev bash

# Build the project
npm run build

# Test normal flow - watch spinner messages
node dist/index.js generate patent-assignment docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml

# Test with slow network (if possible) to see elapsed time updates
# The spinner should update every 5 seconds during generation

# Test with different document types to see full flow
node dist/index.js generate nda-ip-specific docs/testing/scenario-inputs/cil-01-patent-assignment.yaml

# Test error at different stages
# Non-existent template
node dist/index.js generate invalid-type test.yaml

# Non-existent YAML
node dist/index.js generate patent-assignment non-existent.yaml

# Invalid YAML content
echo "invalid: yaml: content:" > bad.yaml
node dist/index.js generate patent-assignment bad.yaml

# Run tests
npm test -- __tests__/commands/generate.test.ts
```

## Common Pitfalls

1. **Timer cleanup**: Always clear intervals on both success and error
2. **Message consistency**: Keep spinner messages consistent in style
3. **Timing accuracy**: Use Date.now() for accurate elapsed time
4. **Test timers**: Use Jest's fake timers for testing time-based features
5. **Visual feedback**: Add brief pauses where needed for UX

## Dependencies

- Existing SpinnerWrapper utility
- All services from previous subtasks
- Node.js timers (setInterval/clearInterval)

## Definition of Done

- [ ] Spinner shows detailed messages for each step
- [ ] Messages are defined as constants for consistency
- [ ] Elapsed time shown during long OpenAI generation
- [ ] Timer updates every 5 seconds during generation
- [ ] Total time shown in success/failure messages
- [ ] Intervals properly cleaned up on completion/error
- [ ] Unit tests cover all spinner scenarios
- [ ] Manual testing shows smooth progression
- [ ] No spinner state conflicts or race conditions 