import { jest } from '@jest/globals';

// Mock modules before importing
jest.mock('../src/utils/logger');
jest.mock('../src/commands/generate', () => {
  const { Command } = require('commander');
  const mockGenerateCommand = new Command('generate');
  mockGenerateCommand.description('Generate a legal document from template and input data');
  mockGenerateCommand.argument('<document-type>', 'Type of legal document to generate');
  mockGenerateCommand.argument('<input-path>', 'Path to YAML input file');
  mockGenerateCommand.action = jest.fn();
  return {
    generateCommand: mockGenerateCommand
  };
});

describe('CLI Entry Point', () => {
  let originalArgv: string[];
  let originalExit: typeof process.exit;

  beforeEach(() => {
    originalArgv = process.argv;
    originalExit = process.exit;
    process.exit = jest.fn() as any;
    
    // Clear module cache to ensure fresh imports
    jest.resetModules();
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
    jest.clearAllMocks();
  });

  it('should load without errors', async () => {
    process.argv = ['node', 'index.js', '--help'];
    
    // Import should not throw
    await expect(import('../src/index')).resolves.not.toThrow();
  });

  it('should have correct CLI structure', async () => {
    // Use minimal args to avoid command execution
    process.argv = ['node', 'index.js'];
    
    // Import the module
    const module = await import('../src/index');
    
    // The module should export nothing (it's a CLI entry point)
    expect(Object.keys(module)).toHaveLength(0);
  });

  it('should accept debug flag', async () => {
    process.argv = ['node', 'index.js', '--debug', '--help'];
    
    // Import should not throw
    await expect(import('../src/index')).resolves.not.toThrow();
  });
}); 