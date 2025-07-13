import { PDFServiceFactory } from '../../../src/services/pdf/PDFServiceFactory';
import { PDFExportService } from '../../../src/services/pdf-export';
import { LegalPDFGenerator } from '../../../src/services/pdf/LegalPDFGenerator';
import { FileOutput } from '../../../src/services/pdf/outputs/FileOutput';
import { BufferOutput } from '../../../src/services/pdf/outputs/BufferOutput';
import { ConsoleProgressReporter } from '../../../src/utils/progress/ConsoleProgressReporter';
import { CallbackProgressReporter } from '../../../src/utils/progress/CallbackProgressReporter';
import { NullProgressReporter } from '../../../src/utils/progress/NullProgressReporter';

// Mock dependencies
jest.mock('../../../src/services/pdf-export');
jest.mock('../../../src/services/pdf/LegalPDFGenerator');
jest.mock('../../../src/services/pdf/outputs/FileOutput');
jest.mock('../../../src/services/pdf/outputs/BufferOutput');
jest.mock('../../../src/utils/progress/ConsoleProgressReporter');
jest.mock('../../../src/utils/progress/CallbackProgressReporter');
jest.mock('../../../src/utils/progress/NullProgressReporter');

describe('PDFServiceFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('forCLI', () => {
    it('should create a service configured for CLI use', () => {
      const service = PDFServiceFactory.forCLI();
      
      expect(PDFExportService).toHaveBeenCalled();
      expect(service).toBeInstanceOf(PDFExportService);
    });

    it('should create with console progress reporter', () => {
      PDFServiceFactory.forCLI();
      
      expect(ConsoleProgressReporter).toHaveBeenCalledWith({
        includeTimestamps: false,
        trackDuration: true
      });
    });
  });

  describe('forGUI', () => {
    it('should create a service configured for GUI use', () => {
      const onProgress = jest.fn();
      const service = PDFServiceFactory.forGUI(onProgress);
      
      expect(PDFExportService).toHaveBeenCalled();
      expect(service).toBeInstanceOf(PDFExportService);
    });

    it('should create with callback progress reporter', () => {
      const onProgress = jest.fn();
      PDFServiceFactory.forGUI(onProgress);
      
      expect(CallbackProgressReporter).toHaveBeenCalledWith(onProgress, {
        includeTimestamps: true,
        trackDuration: true
      });
    });
  });

  describe('forTesting', () => {
    it('should create a service configured for testing', () => {
      const service = PDFServiceFactory.forTesting();
      
      expect(PDFExportService).toHaveBeenCalled();
      expect(service).toBeInstanceOf(PDFExportService);
    });

    it('should create with null progress reporter', () => {
      PDFServiceFactory.forTesting();
      
      expect(NullProgressReporter).toHaveBeenCalledWith(true);
    });
  });

  describe('createPipeline', () => {
    it('should create a complete pipeline with all components', () => {
      const pipeline = PDFServiceFactory.createPipeline();
      
      expect(pipeline).toMatchObject({
        service: expect.any(PDFExportService),
        progressReporter: expect.any(NullProgressReporter),
        generateToFile: expect.any(Function),
        generateToBuffer: expect.any(Function)
      });
    });

    it('should use provided progress reporter', () => {
      const mockReporter = new ConsoleProgressReporter();
      const pipeline = PDFServiceFactory.createPipeline({
        progressReporter: mockReporter
      });
      
      expect(pipeline.progressReporter).toBe(mockReporter);
    });

    it('should generate to file using the service', async () => {
      const mockExport = jest.fn();
      (PDFExportService as jest.Mock).mockImplementation(() => ({
        export: mockExport
      }));
      
      const pipeline = PDFServiceFactory.createPipeline();
      await pipeline.generateToFile('Test content', '/tmp/test.pdf', 'nda-ip-specific');
      
      expect(mockExport).toHaveBeenCalledWith('Test content', '/tmp/test.pdf', 'nda-ip-specific', undefined);
    });

    it('should generate to buffer using the service', async () => {
      const mockBuffer = Buffer.from('test');
      const mockExportToBuffer = jest.fn().mockResolvedValue({ buffer: mockBuffer });
      (PDFExportService as jest.Mock).mockImplementation(() => ({
        exportToBuffer: mockExportToBuffer
      }));
      
      const pipeline = PDFServiceFactory.createPipeline();
      const result = await pipeline.generateToBuffer('Test content', 'nda-ip-specific');
      
      expect(mockExportToBuffer).toHaveBeenCalledWith('Test content', 'nda-ip-specific', undefined);
      expect(result).toBe(mockBuffer);
    });

    it('should throw error if buffer generation fails', async () => {
      const mockExportToBuffer = jest.fn().mockResolvedValue({ buffer: null });
      (PDFExportService as jest.Mock).mockImplementation(() => ({
        exportToBuffer: mockExportToBuffer
      }));
      
      const pipeline = PDFServiceFactory.createPipeline();
      
      await expect(pipeline.generateToBuffer('Test', 'nda-ip-specific'))
        .rejects.toThrow('Buffer generation failed');
    });
  });

  describe('createOutput', () => {
    it('should create FileOutput for file path', () => {
      const output = PDFServiceFactory.createOutput('/tmp/test.pdf');
      
      expect(FileOutput).toHaveBeenCalledWith('/tmp/test.pdf');
      expect(output).toBeInstanceOf(FileOutput);
    });

    it('should create BufferOutput when target is buffer', () => {
      const output = PDFServiceFactory.createOutput('buffer');
      
      expect(BufferOutput).toHaveBeenCalled();
      expect(output).toBeInstanceOf(BufferOutput);
    });
  });

  describe('createGenerator', () => {
    it('should create LegalPDFGenerator with PDFOutput object', () => {
      const mockOutput = new FileOutput('/tmp/test.pdf');
      const generator = PDFServiceFactory.createGenerator(mockOutput, 'nda-ip-specific');
      
      expect(LegalPDFGenerator).toHaveBeenCalledWith(mockOutput, expect.objectContaining({
        documentType: 'nda-ip-specific',
        title: 'nda-ip-specific Document',
        author: 'CaseThread',
        subject: 'Legal Document - nda-ip-specific',
        keywords: ['nda-ip-specific', 'legal', 'document']
      }));
      expect(generator).toBeInstanceOf(LegalPDFGenerator);
    });

    it('should create LegalPDFGenerator with string path', () => {
      const generator = PDFServiceFactory.createGenerator('/tmp/test.pdf', 'nda-ip-specific');
      
      expect(FileOutput).toHaveBeenCalledWith('/tmp/test.pdf');
      expect(LegalPDFGenerator).toHaveBeenCalled();
      expect(generator).toBeInstanceOf(LegalPDFGenerator);
    });

    it('should merge custom options', () => {
      const mockOutput = new FileOutput('/tmp/test.pdf');
      const customOptions = {
        title: 'Custom Title',
        author: 'Custom Author',
        compression: true
      };
      
      PDFServiceFactory.createGenerator(mockOutput, 'nda-ip-specific', customOptions);
      
      expect(LegalPDFGenerator).toHaveBeenCalledWith(mockOutput, expect.objectContaining({
        documentType: 'nda-ip-specific',
        title: 'Custom Title',
        author: 'Custom Author',
        compression: true
      }));
    });
  });

  describe('createProgressReporter', () => {
    it('should create ConsoleProgressReporter', () => {
      const reporter = PDFServiceFactory.createProgressReporter('console');
      
      expect(ConsoleProgressReporter).toHaveBeenCalledWith(undefined);
      expect(reporter).toBeInstanceOf(ConsoleProgressReporter);
    });

    it('should create CallbackProgressReporter with callback', () => {
      const callback = jest.fn();
      const reporter = PDFServiceFactory.createProgressReporter('callback', { callback });
      
      expect(CallbackProgressReporter).toHaveBeenCalledWith(callback, { callback });
      expect(reporter).toBeInstanceOf(CallbackProgressReporter);
    });

    it('should throw error for callback without callback function', () => {
      expect(() => PDFServiceFactory.createProgressReporter('callback'))
        .toThrow('Callback required for callback progress reporter');
    });

    it('should create NullProgressReporter by default', () => {
      const reporter = PDFServiceFactory.createProgressReporter();
      
      expect(NullProgressReporter).toHaveBeenCalled();
      expect(reporter).toBeInstanceOf(NullProgressReporter);
    });

    it('should pass options to reporters', () => {
      const options = { includeTimestamps: true, trackDuration: false };
      
      PDFServiceFactory.createProgressReporter('console', options);
      expect(ConsoleProgressReporter).toHaveBeenCalledWith(options);
    });
  });
}); 