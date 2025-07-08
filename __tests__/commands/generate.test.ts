import { generateCommand } from '../../src/commands/generate';
import { createSpinner } from '../../src/utils/spinner';
import { logger } from '../../src/utils/logger';
import * as validator from '../../src/utils/validator';
import * as templateService from '../../src/services/template';
import * as yamlService from '../../src/services/yaml';
import { OpenAIService } from '../../src/services/openai';
import * as path from 'path';

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
    const mockGenerateDocument = jest.fn();
    (OpenAIService as jest.MockedClass<typeof OpenAIService>).mockImplementation(() => ({
      generateDocument: mockGenerateDocument
    } as any));

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
    
    const mockOpenAIInstance = new (OpenAIService as any)();
    mockOpenAIInstance.generateDocument.mockResolvedValue({ 
      content: 'Generated document content',
      usage: {},
      metadata: {}
    });

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
    expect(mockOpenAIInstance.generateDocument).toHaveBeenCalledWith(
      { template: 'data' },
      'explanation content',
      { yaml: 'data' }
    );
    
    expect(mockSpinner.success).toHaveBeenCalledWith('Document generated successfully!');
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
      expect.stringContaining('Invalid document type: invalid-type')
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should use current directory when output not specified', async () => {
    // Setup successful mocks
    (validator.isValidDocumentType as any).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    
    const mockOpenAIInstance = new (OpenAIService as any)();
    mockOpenAIInstance.generateDocument.mockResolvedValue({ content: 'Generated content' });

    await generateCommand.parseAsync(['node', 'test', 'patent-assignment', 'test.yaml']);

    expect(logger.debug).toHaveBeenCalledWith('Output directory set to: ' + path.resolve('.'));
  });

  it('should use custom output directory when specified', async () => {
    // Setup successful mocks
    (validator.isValidDocumentType as any).mockReturnValue(true);
    (templateService.loadTemplate as jest.Mock).mockResolvedValue({ template: 'data' });
    (templateService.loadExplanation as jest.Mock).mockResolvedValue('explanation');
    (yamlService.parseYaml as jest.Mock).mockResolvedValue({ yaml: 'data' });
    
    const mockOpenAIInstance = new (OpenAIService as any)();
    mockOpenAIInstance.generateDocument.mockResolvedValue({ content: 'Generated content' });

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
    
    const mockOpenAIInstance = new (OpenAIService as any)();
    mockOpenAIInstance.generateDocument.mockResolvedValue({ content: 'Generated content' });

    await generateCommand.parseAsync([
      'node', 'test', 'patent-assignment', 'test.yaml',
      '--output', './new-dir'
    ]);

    expect(mockMkdir).toHaveBeenCalledWith(
      path.resolve('./new-dir'),
      { recursive: true }
    );
    expect(mockSpinner.updateMessage).toHaveBeenCalledWith(
      expect.stringContaining('Creating output directory')
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
      expect.stringContaining('No write permission for output directory')
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });
}); 