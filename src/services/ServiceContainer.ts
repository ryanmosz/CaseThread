import { 
  ITemplateLoader,
  IDocumentFormatter,
  ISignatureParser,
  IMarkdownParser,
  IPDFExportService,
  ServiceConfiguration,
  LayoutEngineFactory,
  PDFGeneratorFactory
} from '../types/services';
import { TemplateService } from './template';
import { DocumentFormatter } from './pdf/DocumentFormatter';
import { SignatureBlockParser } from './pdf/SignatureBlockParser';
import { MarkdownParser } from './pdf/MarkdownParser';
import { PDFLayoutEngine } from './pdf/PDFLayoutEngine';
import { LegalPDFGenerator } from './pdf/LegalPDFGenerator';
import { PDFExportService } from './pdf-export';
import { 
  ConsoleProgressReporter, 
  CallbackProgressReporter, 
  NullProgressReporter,
  ProgressCallback
} from '../utils/progress';
import { ProgressReporter } from '../types/progress';
import { createChildLogger, Logger } from '../utils/logger';

/**
 * Dependency injection container for managing service instances
 */
export class ServiceContainer {
  private static instance: ServiceContainer | null = null;
  private services: Map<string, () => any> = new Map();
  private singletons: Map<string, any> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = createChildLogger({ service: 'ServiceContainer' });
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Reset the singleton (mainly for testing)
   */
  static reset(): void {
    ServiceContainer.instance = null;
  }

  /**
   * Register a service factory
   */
  register<T>(name: string, factory: () => T, singleton: boolean = false): void {
    this.services.set(name, factory);
    if (singleton) {
      // Mark as singleton but don't create yet (lazy initialization)
      this.singletons.set(name, null);
    }
    this.logger.debug('Service registered', { name, singleton });
  }

  /**
   * Get a service instance
   */
  get<T>(name: string): T {
    const factory = this.services.get(name);
    if (!factory) {
      throw new Error(`Service '${name}' not registered in container`);
    }

    // Check if it's a singleton
    if (this.singletons.has(name)) {
      let instance = this.singletons.get(name);
      if (!instance) {
        // Create singleton instance
        instance = factory();
        this.singletons.set(name, instance);
        this.logger.debug('Created singleton instance', { name });
      }
      return instance;
    }

    // Create new instance
    return factory();
  }

  /**
   * Configure container for CLI usage
   */
  static configureCLI(): ServiceContainer {
    const container = new ServiceContainer();
    
    // Register core services as singletons
    container.register<ITemplateLoader>('templateLoader', 
      () => new TemplateService(), 
      true
    );
    
    container.register<IDocumentFormatter>('documentFormatter', 
      () => new DocumentFormatter(), 
      true
    );
    
    container.register<ISignatureParser>('signatureParser', 
      () => new SignatureBlockParser(), 
      true
    );
    
    container.register<IMarkdownParser>('markdownParser', 
      () => new MarkdownParser(), 
      true
    );
    
    container.register<ProgressReporter>('progressReporter', 
      () => new ConsoleProgressReporter({
        includeTimestamps: false,
        trackDuration: true
      }), 
      true
    );
    
    // Register factories
    container.register<LayoutEngineFactory>('layoutEngineFactory', 
      () => (generator, formatter, parser) => 
        new PDFLayoutEngine(generator, formatter, parser)
    );
    
    container.register<PDFGeneratorFactory>('pdfGeneratorFactory', 
      () => (output, options) => 
        new LegalPDFGenerator(output, options)
    );
    
    // Register PDF export service
    container.register<IPDFExportService>('pdfExportService', 
      () => new PDFExportService(
        container.get<IDocumentFormatter>('documentFormatter'),
        container.get<ISignatureParser>('signatureParser'),
        container.get<IMarkdownParser>('markdownParser'),
        container.get<LayoutEngineFactory>('layoutEngineFactory'),
        container.get<PDFGeneratorFactory>('pdfGeneratorFactory'),
        container.get<ProgressReporter>('progressReporter')
      )
    );
    
    return container;
  }

  /**
   * Configure container for GUI usage
   */
  static configureGUI(onProgress: ProgressCallback): ServiceContainer {
    const container = new ServiceContainer();
    
    // Same as CLI but with callback progress reporter
    container.register<ITemplateLoader>('templateLoader', 
      () => new TemplateService(), 
      true
    );
    
    container.register<IDocumentFormatter>('documentFormatter', 
      () => new DocumentFormatter(), 
      true
    );
    
    container.register<ISignatureParser>('signatureParser', 
      () => new SignatureBlockParser(), 
      true
    );
    
    container.register<IMarkdownParser>('markdownParser', 
      () => new MarkdownParser(), 
      true
    );
    
    container.register<ProgressReporter>('progressReporter', 
      () => new CallbackProgressReporter(onProgress, {
        includeTimestamps: true,
        trackDuration: true
      }), 
      true
    );
    
    // Register factories
    container.register<LayoutEngineFactory>('layoutEngineFactory', 
      () => (generator, formatter, parser) => 
        new PDFLayoutEngine(generator, formatter, parser)
    );
    
    container.register<PDFGeneratorFactory>('pdfGeneratorFactory', 
      () => (output, options) => 
        new LegalPDFGenerator(output, options)
    );
    
    // Register PDF export service
    container.register<IPDFExportService>('pdfExportService', 
      () => new PDFExportService(
        container.get<IDocumentFormatter>('documentFormatter'),
        container.get<ISignatureParser>('signatureParser'),
        container.get<IMarkdownParser>('markdownParser'),
        container.get<LayoutEngineFactory>('layoutEngineFactory'),
        container.get<PDFGeneratorFactory>('pdfGeneratorFactory'),
        container.get<ProgressReporter>('progressReporter')
      )
    );
    
    return container;
  }

  /**
   * Configure container for testing
   */
  static configureTesting(config?: Partial<ServiceConfiguration>): ServiceContainer {
    const container = new ServiceContainer();
    
    // Register services with optional overrides
    container.register<ITemplateLoader>('templateLoader', 
      () => config?.templateLoader || new TemplateService(), 
      true
    );
    
    container.register<IDocumentFormatter>('documentFormatter', 
      () => config?.documentFormatter || new DocumentFormatter(), 
      true
    );
    
    container.register<ISignatureParser>('signatureParser', 
      () => config?.signatureParser || new SignatureBlockParser(), 
      true
    );
    
    container.register<IMarkdownParser>('markdownParser', 
      () => config?.markdownParser || new MarkdownParser(), 
      true
    );
    
    container.register<ProgressReporter>('progressReporter', 
      () => config?.progressReporter || new NullProgressReporter(), 
      true
    );
    
    // Register factories with optional overrides
    container.register<LayoutEngineFactory>('layoutEngineFactory', 
      () => config?.layoutEngineFactory || ((generator, formatter, parser) => 
        new PDFLayoutEngine(generator, formatter, parser))
    );
    
    container.register<PDFGeneratorFactory>('pdfGeneratorFactory', 
      () => config?.pdfGeneratorFactory || ((output, options) => 
        new LegalPDFGenerator(output, options))
    );
    
    // Register PDF export service
    container.register<IPDFExportService>('pdfExportService', 
      () => new PDFExportService(
        container.get<IDocumentFormatter>('documentFormatter'),
        container.get<ISignatureParser>('signatureParser'),
        container.get<IMarkdownParser>('markdownParser'),
        container.get<LayoutEngineFactory>('layoutEngineFactory'),
        container.get<PDFGeneratorFactory>('pdfGeneratorFactory'),
        container.get<ProgressReporter>('progressReporter'),
        config?.logger
      )
    );
    
    return container;
  }

  /**
   * Create a custom configured container
   */
  static create(config: ServiceConfiguration): ServiceContainer {
    const container = new ServiceContainer();
    
    // Register all services with provided config
    container.register<ITemplateLoader>('templateLoader', 
      () => config.templateLoader || new TemplateService(), 
      true
    );
    
    container.register<IDocumentFormatter>('documentFormatter', 
      () => config.documentFormatter || new DocumentFormatter(), 
      true
    );
    
    container.register<ISignatureParser>('signatureParser', 
      () => config.signatureParser || new SignatureBlockParser(), 
      true
    );
    
    container.register<IMarkdownParser>('markdownParser', 
      () => config.markdownParser || new MarkdownParser(), 
      true
    );
    
    container.register<ProgressReporter>('progressReporter', 
      () => config.progressReporter || new NullProgressReporter(), 
      true
    );
    
    // Register factories
    container.register<LayoutEngineFactory>('layoutEngineFactory', 
      () => config.layoutEngineFactory || ((generator, formatter, parser) => 
        new PDFLayoutEngine(generator, formatter, parser))
    );
    
    container.register<PDFGeneratorFactory>('pdfGeneratorFactory', 
      () => config.pdfGeneratorFactory || ((output, options) => 
        new LegalPDFGenerator(output, options))
    );
    
    // Register PDF export service
    container.register<IPDFExportService>('pdfExportService', 
      () => new PDFExportService(
        container.get<IDocumentFormatter>('documentFormatter'),
        container.get<ISignatureParser>('signatureParser'),
        container.get<IMarkdownParser>('markdownParser'),
        container.get<LayoutEngineFactory>('layoutEngineFactory'),
        container.get<PDFGeneratorFactory>('pdfGeneratorFactory'),
        container.get<ProgressReporter>('progressReporter'),
        config.logger
      )
    );
    
    return container;
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
    this.logger.debug('Container cleared');
  }
} 