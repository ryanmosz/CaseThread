import { jest } from '@jest/globals';

// Mock ora before any modules that use it
jest.mock('ora');

describe('CLI Entry Point', () => {
  let originalArgv: string[];

  beforeEach(() => {
    originalArgv = process.argv;
    jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    jest.clearAllMocks();
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