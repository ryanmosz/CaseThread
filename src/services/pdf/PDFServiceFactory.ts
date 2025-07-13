import { PDFExportService, PDFExportOptions } from '../pdf-export';
import { LegalPDFGenerator } from './LegalPDFGenerator';
import { FileOutput, BufferOutput } from './outputs';
import { 
  PDFOutput, 
  PDFGenerationOptions
} from '../../types/pdf';
import { ProgressReporter } from '../../types/progress';
import { 
  ConsoleProgressReporter, 
  CallbackProgressReporter, 
  NullProgressReporter,
  ProgressCallback
} from '../../utils/progress';
import { createChildLogger } from '../../utils/logger';
import { ServiceContainer } from '../ServiceContainer';
import { IPDFExportService, ServiceConfiguration } from '../../types/services';

/**
 * Options for creating a PDF pipeline
 */
export interface PDFPipelineOptions {
  progressReporter?: ProgressReporter;
  defaultOptions?: PDFExportOptions;
  enableWarnings?: boolean;
  trackMemoryUsage?: boolean;
}

/**
 * Factory for creating PDF service components with sensible defaults
 */
export class PDFServiceFactory {
  private static logger = createChildLogger({ service: 'PDFServiceFactory' });
  
  /**
   * Create a configured PDF export service with custom configuration
   */
  static createExportService(config: Partial<ServiceConfiguration>): IPDFExportService {
    // Create custom container with provided configuration
    const container = ServiceContainer.create({
      progressReporter: new NullProgressReporter(),
      ...config
    });
    
    this.logger.debug('Created PDF export service', {
      hasCustomConfig: Object.keys(config).length > 0
    });
    
    return container.get<IPDFExportService>('pdfExportService');
  }
  
  /**
   * Create a PDF generator with output
   */
  static createGenerator(
    output: PDFOutput | string,
    documentType: string,
    options?: Partial<PDFGenerationOptions>
  ): LegalPDFGenerator {
    // Convert string to FileOutput if needed
    const pdfOutput = typeof output === 'string' 
      ? new FileOutput(output) 
      : output;
    
    const generationOptions: PDFGenerationOptions = {
      documentType,
      title: options?.title || `${documentType} Document`,
      author: options?.author || 'CaseThread',
      subject: options?.subject || `Legal Document - ${documentType}`,
      keywords: options?.keywords || [documentType, 'legal', 'document'],
      ...options
    };
    
    this.logger.debug('Created PDF generator', {
      outputType: pdfOutput.getType(),
      documentType,
      hasCustomOptions: !!options
    });
    
    return new LegalPDFGenerator(pdfOutput, generationOptions);
  }
  
  /**
   * Create appropriate output based on target
   */
  static createOutput(target: string | 'buffer'): PDFOutput {
    if (target === 'buffer') {
      this.logger.debug('Created buffer output');
      return new BufferOutput();
    } else {
      this.logger.debug('Created file output', { path: target });
      return new FileOutput(target);
    }
  }
  
  /**
   * Create a progress reporter based on environment
   */
  static createProgressReporter(type: 'console' | 'callback' | 'null' = 'null', options?: {
    callback?: ProgressCallback;
    includeTimestamps?: boolean;
    trackDuration?: boolean;
  }): ProgressReporter {
    switch (type) {
      case 'console':
        this.logger.debug('Created console progress reporter');
        return new ConsoleProgressReporter(options);
        
      case 'callback':
        if (!options?.callback) {
          throw new Error('Callback required for callback progress reporter');
        }
        this.logger.debug('Created callback progress reporter');
        return new CallbackProgressReporter(options.callback, options);
        
      case 'null':
      default:
        this.logger.debug('Created null progress reporter');
        return new NullProgressReporter();
    }
  }
  
  /**
   * Create a complete PDF pipeline for easy use
   */
  static createPipeline(options?: PDFPipelineOptions): {
    service: PDFExportService;
    progressReporter: ProgressReporter;
    generateToFile: (text: string, outputPath: string, documentType: string) => Promise<void>;
    generateToBuffer: (text: string, documentType: string) => Promise<Buffer>;
  } {
    const progressReporter = options?.progressReporter || this.createProgressReporter('null');
    const service = this.createExportService({
      progressReporter
    });
    
    return {
      service,
      progressReporter,
      
      /**
       * Generate PDF to file
       */
      async generateToFile(text: string, outputPath: string, documentType: string): Promise<void> {
        await service.export(text, outputPath, documentType, options?.defaultOptions);
      },
      
      /**
       * Generate PDF to buffer
       */
      async generateToBuffer(text: string, documentType: string): Promise<Buffer> {
        const result = await service.exportToBuffer(text, documentType, options?.defaultOptions);
        if (!result.buffer) {
          throw new Error('Buffer generation failed');
        }
        return result.buffer;
      }
    };
  }
  
  /**
   * Create a preconfigured service for CLI usage
   */
  static forCLI(): IPDFExportService {
    const container = ServiceContainer.configureCLI();
    return container.get<IPDFExportService>('pdfExportService');
  }
  
  /**
   * Create a preconfigured service for GUI usage
   */
  static forGUI(onProgress: ProgressCallback): IPDFExportService {
    const container = ServiceContainer.configureGUI(onProgress);
    return container.get<IPDFExportService>('pdfExportService');
  }
  
  /**
   * Create a preconfigured service for testing
   */
  static forTesting(config?: Partial<ServiceConfiguration>): IPDFExportService {
    const container = ServiceContainer.configureTesting(config);
    return container.get<IPDFExportService>('pdfExportService');
  }
} 