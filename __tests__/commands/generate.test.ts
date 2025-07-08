import { generateCommand } from '../../src/commands/generate';
import { createSpinner } from '../../src/utils/spinner';
import { logger } from '../../src/utils/logger';
import * as validator from '../../src/utils/validator';
import * as templateService from '../../src/services/template';
import * as yamlService from '../../src/services/yaml';
import { generateDocument } from '../../src/services/openai';
import * as path from 'path';

// Add file writer mocks
jest.mock('../../src/services/file-writer');
jest.mock('../../src/utils/file-naming');
jest.mock('../../src/utils/error-handler');

import * as fileWriter from '../../src/services/file-writer';
import * as fileNaming from '../../src/utils/file-naming';
import { handleError } from '../../src/utils/error-handler';

// Mock ora before other modules that use it
jest.mock('ora');

// Mock dotenv to prevent logging
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

// Mock fs promises
jest.mock('fs', () => {
  const mockAccess = jest.fn();
  const mockMkdir = jest.fn();
  return {
    promises: {
      access: mockAccess,
      mkdir: mockMkdir,
      constants: {
        W_OK: 2
      }
    }
  };
});

// Mock all dependencies
jest.mock('../../src/utils/spinner');
jest.mock('../../src/utils/logger');
jest.mock('../../src/utils/validator');
jest.mock('../../src/services/template');
jest.mock('../../src/services/yaml');
jest.mock('../../src/services/openai');

// Get fs mocks after they're created
import { promises as fs } from 'fs';
const mockAccess = fs.access as jest.Mock;
const mockMkdir = fs.mkdir as jest.Mock;

describe('Generate Command', () => {
  let mockSpinner: any;
  let mockExit: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    // Setup spinner mock
    mockSpinner = {
      updateMessage: jest.fn(),
      success: jest.fn(),
      fail: jest.fn(),
      stop: jest.fn(),
      isSpinning: true
    };
    (createSpinner as jest.Mock).mockReturnValue(mockSpinner);

    // Setup OpenAI mock
    (generateDocument as jest.Mock).mockResolvedValue('Generated document content');

    // Setup process.exit mock
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Setup console.log spy
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // Setup logger mock
    (logger.debug as jest.Mock).mockImplementation();
    (logger.error as jest.Mock).mockImplementation();

    // Setup fs mocks
    mockAccess.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should have correct command structure', () => {
    expect(generateCommand.name()).toBe('generate');
    expect(generateCommand.description()).toBe('Generate a legal document from template and input data');
    expect(generateCommand.args.length).toBe(2);
    expect(generateCommand.args[0]).toBe('<document-type>');
    expect(generateCommand.args[1]).toBe('<input-path>');
  });

  it('should have output option with default value', () => {
    const outputOption = generateCommand.options.find(opt => opt.long === '--output');
    expect(outputOption).toBeDefined();
    expect(outputOption?.short).toBe('-o');
    expect(outputOption?.defaultValue).toBe('.');
    expect(outputOption?.description).toBe('Output directory for generated document');
  });

  it('should successfully generate a document with valid inputs', async () => {
    // Setup mocks
    (validator.isValidDocumentType as any).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation content');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    
    (generateDocument as jest.Mock).mockResolvedValue('Generated document content');

    // Execute command
    await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);

    // Verify flow
    expect(mockSpinner.updateMessage).toHaveBeenCalledWith('Validating document type...');
    expect(validator.isValidDocumentType).toHaveBeenCalledWith('patent-assignment');
    
    expect(mockSpinner.updateMessage).toHaveBeenCalledWith('Loading document template...');
    expect(templateService.loadTemplate).toHaveBeenCalledWith('patent-assignment');
    expect(templateService.loadExplanation).toHaveBeenCalledWith('patent-assignment');
    
    expect(mockSpinner.updateMessage).toHaveBeenCalledWith('Validating input data...');
    expect(yamlService.parseYaml).toHaveBeenCalledWith('test.yaml');
    
    expect(mockSpinner.updateMessage).toHaveBeenCalledWith('Generating document (this may take 30-60 seconds)...');
    expect(generateDocument).toHaveBeenCalledWith(
      { template: 'data' },
      'explanation content',
      { yaml: 'data' }
    );
    
    expect(mockSpinner.success).toHaveBeenCalledWith(
      expect.stringMatching(/Document generated successfully! \(completed in \d+s\)/)
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('Generated document content');
  });

  it('should handle invalid document type', async () => {
    (validator.isValidDocumentType as any).mockReturnValue(false);
    (validator.SUPPORTED_TYPES as any) = ['patent-assignment', 'nda'];

    try {
      await generateCommand.parseAsync(['node', 'test', 'invalid-type', 'test.yaml']);
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toBe('process.exit called');
    }

    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringMatching(/Invalid document type: invalid-type.*\(failed after \d+s\)/)
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should use current directory when output not specified', async () => {
    // Setup successful mocks
    (validator.isValidDocumentType as any).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    
    (generateDocument as jest.Mock).mockResolvedValue('Generated content');

    await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);

    expect(logger.debug).toHaveBeenCalledWith('Output directory set to: ' + path.resolve('.'));
  });

  it('should use custom output directory when specified', async () => {
    // Setup successful mocks
    (validator.isValidDocumentType as any).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    
    (generateDocument as jest.Mock).mockResolvedValue('Generated content');

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
    mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
    
    // Setup successful mocks
    (validator.isValidDocumentType as any).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    
    (generateDocument as jest.Mock).mockResolvedValue('Generated content');

    await generateCommand.parseAsync([
      'node', 'test', 'patent-assignment', 'test.yaml',
      '--output', './new-dir'
    ]);

    expect(mockMkdir).toHaveBeenCalledWith(
      path.resolve('./new-dir'),
      { recursive: true }
    );
    expect(mockSpinner.updateMessage).toHaveBeenCalledWith(
      'Creating output directory...'
    );
  });

  it('should fail if output directory has no write permission', async () => {
    // First access succeeds (directory exists)
    mockAccess.mockResolvedValueOnce(undefined);
    // Second access fails (no write permission)
    mockAccess.mockRejectedValueOnce(new Error('EACCES'));

    (validator.isValidDocumentType as any).mockReturnValue(true);

    try {
      await generateCommand.parseAsync([
        'node', 'test', 'patent-assignment', 'test.yaml',
        '--output', '/read-only-dir'
      ]);
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toBe('process.exit called');
    }

    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringMatching(/No write permission for output directory.*\(failed after \d+s\)/)
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

describe('Generate Command - Spinner Updates', () => {
  let mockSpinner: any;
  let mockSetInterval: jest.SpyInstance;
  let mockClearInterval: jest.SpyInstance;

  // Use fake timers
  beforeEach(() => {
    jest.useFakeTimers();
    
    // Setup spinner mock
    mockSpinner = {
      updateMessage: jest.fn(),
      success: jest.fn(),
      fail: jest.fn(),
      stop: jest.fn(),
      isSpinning: true
    };
    (createSpinner as jest.Mock).mockReturnValue(mockSpinner);

    // Setup OpenAI mock
    (generateDocument as jest.Mock).mockResolvedValue('Generated document content');

    // Setup interval spies
    mockSetInterval = jest.spyOn(global, 'setInterval');
    mockClearInterval = jest.spyOn(global, 'clearInterval');

    // Setup other mocks
    (logger.debug as jest.Mock).mockImplementation();
    (logger.error as jest.Mock).mockImplementation();
    mockAccess.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should show all spinner messages in correct order', async () => {
    // Setup all mocks for success
    (validator.isValidDocumentType as any).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    
    (generateDocument as jest.Mock).mockResolvedValue('Generated content');

    await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);

    // Verify spinner messages in order
    const updateCalls = mockSpinner.updateMessage.mock.calls.map((call: any[]) => call[0]);
    
    expect(updateCalls).toContain('Validating document type...');
    expect(updateCalls).toContain('Loading document template...');
    expect(updateCalls).toContain('Loading template explanation...');
    expect(updateCalls).toContain('Parsing input data...');
    expect(updateCalls).toContain('Validating input data...');
    expect(updateCalls).toContain('Preparing AI prompt...');
    expect(updateCalls).toContain('Connecting to OpenAI...');
    expect(updateCalls).toContain('Generating document (this may take 30-60 seconds)...');
    
    // Verify final success message includes timing
    expect(mockSpinner.success).toHaveBeenCalledWith(
      expect.stringMatching(/Document generated successfully! \(completed in \d+s\)/)
    );
  });

  it('should update spinner with elapsed time during generation', async () => {
    // Setup mocks
    (validator.isValidDocumentType as any).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    
    // Make generateDocument take time
    (generateDocument as jest.Mock).mockImplementation(
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
    mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
    
    // Setup other mocks
    (validator.isValidDocumentType as any).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    
    (generateDocument as jest.Mock).mockResolvedValue('Generated');

    await generateCommand.parseAsync([
      'node', 'test', 'patent-assignment', 'test.yaml',
      '--output', './new-dir'
    ]);

    expect(mockSpinner.updateMessage).toHaveBeenCalledWith('Creating output directory...');
  });

  it('should include timing in error message', async () => {
    (validator.isValidDocumentType as any).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockRejectedValue(
      new Error('Template not found')
    );

    // Mock Date.now to control timing
    const mockNow = jest.spyOn(Date, 'now');
    mockNow.mockReturnValueOnce(1000); // Start time
    mockNow.mockReturnValueOnce(3500); // End time (2.5 seconds later, rounds to 3)

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
    (validator.isValidDocumentType as any).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    
    (generateDocument as jest.Mock).mockRejectedValue(new Error('API error'));

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);
      fail('Should have thrown');
    } catch {
      // Expected
    }

    expect(mockSetInterval).toHaveBeenCalled();
    expect(mockClearInterval).toHaveBeenCalled();
  });

  it('should show checking permissions message when directory exists', async () => {
    // Directory exists
    mockAccess.mockResolvedValueOnce(undefined);
    
    // Setup other mocks
    (validator.isValidDocumentType as any).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    
    (generateDocument as jest.Mock).mockResolvedValue('Generated');

    await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);

    expect(mockSpinner.updateMessage).toHaveBeenCalledWith('Checking directory permissions...');
  });
}); 

describe('Generate Command - Error Handling', () => {
  let mockSpinner: any;
  let mockExit: jest.SpyInstance;

  beforeEach(() => {
    mockSpinner = {
      updateMessage: jest.fn(),
      fail: jest.fn(),
      success: jest.fn(),
      succeed: jest.fn()
    };
    jest.doMock('../../src/utils/spinner', () => ({
      createSpinner: jest.fn(() => mockSpinner),
      CaseThreadSpinner: jest.fn()
    }));
    
    mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit called with code ${code}`);
    });
    
    // Mock the generate command's error handler to use our mock spinner
    (handleError as jest.Mock).mockImplementation((error, spinner) => {
      spinner.fail(error.message);
      process.exit(1);
    });
  });

  afterEach(() => {
    mockExit.mockRestore();
    jest.clearAllMocks();
  });

  it('should show user-friendly message for invalid document type', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(false);
    (validator.SUPPORTED_TYPES as any) = ['patent-assignment', 'nda-ip-specific'];

    try {
      await generateCommand.parseAsync(['node', 'test', 'invalid-type', 'test.yaml']);
      fail('Should have thrown');
    } catch (error: any) {
      expect(error.message).toContain('process.exit called with code 1');
    }
    
    expect(handleError).toHaveBeenCalled();
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
    } catch (error: any) {
      expect(error.message).toContain('process.exit called with code 1');
    }
    
    expect(handleError).toHaveBeenCalled();
  });

  it('should show user-friendly message for template not found', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockRejectedValue(
      new Error('ENOENT: no such file or directory')
    );

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);
      fail('Should have thrown');
    } catch (error: any) {
      expect(error.message).toContain('process.exit called with code 1');
    }
    
    expect(handleError).toHaveBeenCalled();
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
    } catch (error: any) {
      expect(error.message).toContain('process.exit called with code 1');
    }
    
    expect(handleError).toHaveBeenCalled();
  });

  it('should exit with code 0 on success', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({});
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({});
    (generateDocument as jest.Mock).mockResolvedValue('Generated');
    (fileNaming.createOutputPath as jest.Mock).mockReturnValue('/output/test.md');
    (fileWriter.addDocumentMetadata as jest.Mock).mockImplementation((content) => `<!-- metadata -->\n${content}`);
    (fileWriter.saveDocument as jest.Mock).mockResolvedValue({
      path: '/output/test.md',
      size: 1024,
      timestamp: new Date()
    });

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);
      fail('Should have thrown');
    } catch (error: any) {
      expect(error.message).toContain('process.exit called with code 0');
    }
  });
});

describe('Generate Command - Debug Flag', () => {
  let mockSpinner: any;
  let originalLevel: string;

  beforeEach(() => {
    originalLevel = logger.level;
    logger.level = 'info';
    
    mockSpinner = {
      updateMessage: jest.fn(),
      fail: jest.fn(),
      success: jest.fn(),
      succeed: jest.fn()
    };
    jest.doMock('../../src/utils/spinner', () => ({
      createSpinner: jest.fn(() => mockSpinner),
      CaseThreadSpinner: jest.fn()
    }));
  });

  afterEach(() => {
    logger.level = originalLevel;
    jest.clearAllMocks();
  });

  it('should enable debug logging with command-level --debug flag', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({});
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({});
    (generateDocument as jest.Mock).mockResolvedValue('Generated');
    (fileNaming.createOutputPath as jest.Mock).mockReturnValue('/output/test.md');
    (fileWriter.addDocumentMetadata as jest.Mock).mockImplementation((content) => content);
    (fileWriter.saveDocument as jest.Mock).mockResolvedValue({
      path: '/output/test.md',
      size: 1024,
      timestamp: new Date()
    });

    const debugSpy = jest.spyOn(logger, 'debug');

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml', '--debug']);
    } catch {
      // Ignore exit
    }

    expect(logger.level).toBe('debug');
    expect(debugSpy).toHaveBeenCalledWith('Debug logging enabled via command flag');
    expect(debugSpy).toHaveBeenCalledWith('=== Generate Command Execution ===');
  });

  it('should not enable debug logging without flag', async () => {
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({});
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({});
    (generateDocument as jest.Mock).mockResolvedValue('Generated');
    (fileNaming.createOutputPath as jest.Mock).mockReturnValue('/output/test.md');
    (fileWriter.addDocumentMetadata as jest.Mock).mockImplementation((content) => content);
    (fileWriter.saveDocument as jest.Mock).mockResolvedValue({
      path: '/output/test.md',
      size: 1024,
      timestamp: new Date()
    });

    const debugSpy = jest.spyOn(logger, 'debug');

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);
    } catch {
      // Ignore exit
    }

    expect(logger.level).toBe('info');
    expect(debugSpy).not.toHaveBeenCalled();
  });
});

describe('Generate Command - File Saving', () => {
  let mockSpinner: any;

  beforeEach(() => {
    mockSpinner = {
      updateMessage: jest.fn(),
      fail: jest.fn(),
      success: jest.fn(),
      succeed: jest.fn()
    };
    jest.doMock('../../src/utils/spinner', () => ({
      createSpinner: jest.fn(() => mockSpinner),
      CaseThreadSpinner: jest.fn()
    }));
    
    // Setup file naming mocks
    (fileNaming.createOutputPath as jest.Mock).mockReturnValue('/output/patent-assignment-2024-01-15-143052.md');
    
    // Setup file writer mocks
    (fileWriter.addDocumentMetadata as jest.Mock).mockImplementation((content) => `<!-- metadata -->\n${content}`);
    (fileWriter.saveDocument as jest.Mock).mockResolvedValue({
      path: '/output/patent-assignment-2024-01-15-143052.md',
      size: 1024,
      timestamp: new Date()
    });
  });

  it('should save generated document with timestamp', async () => {
    // Setup all successful mocks
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({});
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({});
    (generateDocument as jest.Mock).mockResolvedValue('Generated document content');

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);
    } catch {
      // Ignore exit
    }

    // Verify file naming
    expect(fileNaming.createOutputPath).toHaveBeenCalledWith(
      path.resolve('.'),
      'patent-assignment'
    );

    // Verify metadata added
    expect(fileWriter.addDocumentMetadata).toHaveBeenCalledWith(
      'Generated document content',
      'patent-assignment',
      'test.yaml',
      expect.any(Number)
    );

    // Verify document saved
    expect(fileWriter.saveDocument).toHaveBeenCalledWith(
      '<!-- metadata -->\nGenerated document content',
      '/output/patent-assignment-2024-01-15-143052.md'
    );

    // Verify success message
    expect(mockSpinner.succeed).toHaveBeenCalled();
  });

  it('should use custom output directory', async () => {
    // Setup mocks
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({});
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({});
    (generateDocument as jest.Mock).mockResolvedValue('Generated');

    try {
      await generateCommand.parseAsync([
        'node', 'test', 'patent-assignment', 'test.yaml',
        '--output', './my-docs'
      ]);
    } catch {
      // Ignore exit
    }

    expect(fileNaming.createOutputPath).toHaveBeenCalledWith(
      path.resolve('./my-docs'),
      'patent-assignment'
    );
  });

  it('should display success information', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // Setup mocks
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({});
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({});
    (generateDocument as jest.Mock).mockResolvedValue('Generated');

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);
    } catch {
      // Ignore exit
    }

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✨ Document Generation Complete!'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('📄 Document Type: patent-assignment'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('📁 Saved to:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('📏 File size:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('⏱️  Generation time:'));
    
    consoleLogSpy.mockRestore();
  });

  it('should handle file save errors', async () => {
    // Setup mocks
    (validator.isValidDocumentType as jest.Mock).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({});
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({});
    (generateDocument as jest.Mock).mockResolvedValue('Generated');
    (fileWriter.saveDocument as jest.Mock).mockRejectedValue(
      new Error('Failed to save document: Permission denied')
    );

    try {
      await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);
      fail('Should have thrown');
    } catch (error: any) {
      expect(error.message).toContain('process.exit called with code 1');
    }

    expect(handleError).toHaveBeenCalled();
  });
}); 