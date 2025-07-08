/**
 * Document Indexing Service - Loads mock legal documents into ChromaDB
 * Processes the mock law firm data for context retrieval
 */

import { promises as fs } from 'fs';
import path from 'path';
import { StoredDocument, getRetrieverService } from './retriever';
import { logger } from '../utils/logger';

export interface IndexingStats {
  documentsProcessed: number;
  documentsIndexed: number;
  errors: string[];
  totalContentLength: number;
  processingTime: number;
}

export interface ClientInfo {
  name: string;
  industry: string;
  type: string;
  established: string;
  description: string;
  headquarters: string;
  employees: number;
  primary_practice_areas: string[];
  key_technologies?: string[];
  key_people: Array<{
    name: string;
    title: string;
    email: string;
  }>;
}

export interface AttorneyInfo {
  name: string;
  title: string;
  bar_admissions: string[];
  specialties: string[];
  education: Array<{
    degree: string;
    institution: string;
    year: number;
  }>;
  experience_years: number;
  email: string;
  phone: string;
  bio: string;
  writing_style: {
    formality: string;
    tone: string;
    structure: string;
    key_phrases: string[];
  };
}

export class DocumentIndexerService {
  private mockDataPath: string;
  private stats: IndexingStats;

  constructor(mockDataPath: string = 'mock-data') {
    this.mockDataPath = path.resolve(mockDataPath);
    this.stats = {
      documentsProcessed: 0,
      documentsIndexed: 0,
      errors: [],
      totalContentLength: 0,
      processingTime: 0
    };
  }

  /**
   * Index all mock legal documents into ChromaDB
   */
  async indexAllDocuments(): Promise<IndexingStats> {
    const startTime = Date.now();
    this.resetStats();

    logger.info('Starting document indexing', {
      mockDataPath: this.mockDataPath
    });

    try {
      // Initialize retriever service
      await getRetrieverService().initialize();

      // Get all attorney directories
      const attorneysPath = path.join(this.mockDataPath, 'attorneys');
      const attorneyDirs = await fs.readdir(attorneysPath);

      for (const attorneyDir of attorneyDirs) {
        const attorneyPath = path.join(attorneysPath, attorneyDir);
        const attorneyStats = await fs.stat(attorneyPath);
        
        if (attorneyStats.isDirectory()) {
          await this.indexAttorneyDocuments(attorneyPath, attorneyDir);
        }
      }

      this.stats.processingTime = Date.now() - startTime;

      logger.info('Document indexing completed', {
        documentsProcessed: this.stats.documentsProcessed,
        documentsIndexed: this.stats.documentsIndexed,
        errors: this.stats.errors.length,
        processingTime: this.stats.processingTime
      });

      return this.stats;
    } catch (error) {
      logger.error('Document indexing failed', { error });
      this.stats.errors.push(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Index documents for a specific attorney
   */
  private async indexAttorneyDocuments(attorneyPath: string, attorneyName: string): Promise<void> {
    logger.debug(`Indexing documents for attorney: ${attorneyName}`);

    // Load attorney profile
    const attorneyProfile = await this.loadAttorneyProfile(attorneyPath);
    
    // Process all clients for this attorney
    const clientsPath = path.join(attorneyPath, 'clients');
    
    try {
      const clientDirs = await fs.readdir(clientsPath);
      
      for (const clientDir of clientDirs) {
        const clientPath = path.join(clientsPath, clientDir);
        const clientStats = await fs.stat(clientPath);
        
        if (clientStats.isDirectory()) {
          await this.indexClientDocuments(clientPath, clientDir, attorneyProfile);
        }
      }
    } catch (error) {
      logger.warn(`No clients directory found for attorney: ${attorneyName}`);
    }
  }

  /**
   * Index documents for a specific client
   */
  private async indexClientDocuments(clientPath: string, clientName: string, attorneyProfile: AttorneyInfo): Promise<void> {
    logger.debug(`Indexing documents for client: ${clientName}`);

    // Load client info
    const clientInfo = await this.loadClientInfo(clientPath);
    
    // Get all markdown files in the client directory
    const files = await fs.readdir(clientPath);
    const markdownFiles = files.filter(file => file.endsWith('.md'));

    for (const filename of markdownFiles) {
      const filePath = path.join(clientPath, filename);
      
      try {
        await this.indexDocument(filePath, filename, clientInfo, attorneyProfile);
        this.stats.documentsIndexed++;
      } catch (error) {
        logger.error(`Failed to index document: ${filename}`, { error });
        this.stats.errors.push(`${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      this.stats.documentsProcessed++;
    }
  }

  /**
   * Index a single document
   */
  private async indexDocument(
    filePath: string,
    filename: string,
    clientInfo: ClientInfo,
    attorneyProfile: AttorneyInfo
  ): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      this.stats.totalContentLength += content.length;

      // Extract document metadata from filename and content
      const documentMetadata = this.extractDocumentMetadata(filename, content);
      
      logger.debug(`Processing document: ${filename}`, {
        documentType: documentMetadata.documentType,
        title: documentMetadata.title,
        attorneyName: attorneyProfile.name,
        clientName: clientInfo.name
      });
      
      // Create stored document
      const storedDocument: StoredDocument = {
        id: this.generateDocumentId(attorneyProfile.name, clientInfo.name, filename),
        content: content,
        metadata: {
          title: documentMetadata.title,
          source: `${attorneyProfile.name} - ${clientInfo.name}`,
          documentType: documentMetadata.documentType,
          jurisdiction: documentMetadata.jurisdiction,
          date: documentMetadata.date,
          citation: `${attorneyProfile.name} - ${clientInfo.name} - ${documentMetadata.title}`,
          relevanceScore: 1.0,
          // Additional context for better retrieval
          attorney: attorneyProfile.name,
          client: clientInfo.name,
          industry: clientInfo.industry,
          practiceArea: this.inferPracticeArea(documentMetadata.documentType),
          writingStyle: attorneyProfile.writing_style?.tone || 'professional'
        }
      };

      // Store in vector database
      await getRetrieverService().storeDocument(storedDocument);

      logger.debug(`Indexed document: ${filename}`, {
        id: storedDocument.id,
        contentLength: content.length,
        documentType: documentMetadata.documentType
      });
    } catch (error) {
      logger.error(`Failed to index document: ${filename}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Extract document metadata from filename and content
   */
  private extractDocumentMetadata(filename: string, content: string): {
    title: string;
    documentType: string;
    date: string;
    jurisdiction?: string;
  } {
    // Extract date from filename (YYYY-MM-DD format)
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

    // Extract document type from filename
    const documentType = this.inferDocumentType(filename);

    // Extract title from filename (remove date and extension)
    const title = filename
      .replace(/^\d{4}-\d{2}-\d{2}-/, '')
      .replace(/\.md$/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    // Try to extract jurisdiction from content
    const jurisdiction = this.extractJurisdiction(content);

    return {
      title,
      documentType,
      date,
      jurisdiction
    };
  }

  /**
   * Infer document type from filename
   */
  private inferDocumentType(filename: string): string {
    // Add null/undefined check
    if (!filename || typeof filename !== 'string') {
      return 'legal-document';
    }
    
    const lowerFilename = filename.toLowerCase();
    
    if (lowerFilename.includes('patent-assignment')) return 'patent-assignment-agreement';
    if (lowerFilename.includes('patent-license')) return 'patent-license-agreement';
    if (lowerFilename.includes('office-action')) return 'office-action-response';
    if (lowerFilename.includes('cease-desist') || lowerFilename.includes('cease-and-desist')) return 'cease-and-desist-letter';
    if (lowerFilename.includes('trademark-application')) return 'trademark-application';
    if (lowerFilename.includes('provisional-patent')) return 'provisional-patent-application';
    if (lowerFilename.includes('technology-transfer')) return 'technology-transfer-agreement';
    if (lowerFilename.includes('nda') || lowerFilename.includes('confidentiality')) return 'nda-ip-specific';
    if (lowerFilename.includes('memo') || lowerFilename.includes('consultation')) return 'legal-memo';
    if (lowerFilename.includes('license') && !lowerFilename.includes('patent')) return 'license-agreement';
    if (lowerFilename.includes('assignment') && !lowerFilename.includes('patent')) return 'assignment-agreement';
    if (lowerFilename.includes('response')) return 'legal-response';
    if (lowerFilename.includes('letter')) return 'legal-letter';
    
    return 'legal-document';
  }

  /**
   * Infer practice area from document type
   */
  private inferPracticeArea(documentType: string): string {
    // Add null/undefined check
    if (!documentType || typeof documentType !== 'string') {
      return 'Intellectual Property';
    }
    
    const lowerDocType = documentType.toLowerCase();
    
    if (lowerDocType.includes('patent')) return 'Patent Law';
    if (lowerDocType.includes('trademark')) return 'Trademark Law';
    if (lowerDocType.includes('copyright')) return 'Copyright Law';
    if (lowerDocType.includes('technology-transfer')) return 'Technology Transfer';
    if (lowerDocType.includes('nda')) return 'IP Protection';
    if (lowerDocType.includes('license')) return 'IP Licensing';
    if (lowerDocType.includes('cease-desist')) return 'IP Enforcement';
    
    return 'Intellectual Property';
  }

  /**
   * Extract jurisdiction from document content
   */
  private extractJurisdiction(content: string): string | undefined {
    const jurisdictionPatterns = [
      /governing law[:\s]+([^.\n]+)/i,
      /jurisdiction[:\s]+([^.\n]+)/i,
      /state of ([^.\n,]+)/i,
      /(\w+) state law/i
    ];

    for (const pattern of jurisdictionPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(attorney: string, client: string, filename: string): string {
    // Add null/undefined checks
    const safeAttorney = attorney || 'unknown-attorney';
    const safeClient = client || 'unknown-client';
    const safeFilename = filename || 'unknown-file';
    
    const attorneySlug = safeAttorney.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const clientSlug = safeClient.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileSlug = safeFilename.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/\.md$/, '');
    
    return `${attorneySlug}-${clientSlug}-${fileSlug}`;
  }

  /**
   * Load attorney profile
   */
  private async loadAttorneyProfile(attorneyPath: string): Promise<AttorneyInfo> {
    const profilePath = path.join(attorneyPath, 'attorney-profile.json');
    
    try {
      const content = await fs.readFile(profilePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.warn(`No attorney profile found at: ${profilePath}`);
      
      // Return default profile based on directory name
      const attorneyName = path.basename(attorneyPath).replace(/-/g, ' ');
      return {
        name: attorneyName,
        title: 'Attorney',
        bar_admissions: ['State Bar'],
        specialties: ['Intellectual Property'],
        education: [],
        experience_years: 10,
        email: `${attorneyName.replace(/\s+/g, '.').toLowerCase()}@example.com`,
        phone: '(555) 123-4567',
        bio: 'Experienced IP attorney',
        writing_style: {
          formality: 'professional',
          tone: 'authoritative',
          structure: 'logical',
          key_phrases: []
        }
      };
    }
  }

  /**
   * Load client information
   */
  private async loadClientInfo(clientPath: string): Promise<ClientInfo> {
    const clientInfoPath = path.join(clientPath, 'client-info.json');
    
    try {
      const content = await fs.readFile(clientInfoPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.warn(`No client info found at: ${clientInfoPath}`);
      
      // Return default client info based on directory name
      const clientName = path.basename(clientPath).replace(/-/g, ' ');
      return {
        name: clientName,
        industry: 'Technology',
        type: 'Corporation',
        established: '2020',
        description: 'Technology company',
        headquarters: 'San Francisco, CA',
        employees: 50,
        primary_practice_areas: ['Intellectual Property'],
        key_people: []
      };
    }
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      documentsProcessed: 0,
      documentsIndexed: 0,
      errors: [],
      totalContentLength: 0,
      processingTime: 0
    };
  }

  /**
   * Get current indexing statistics
   */
  getStats(): IndexingStats {
    return { ...this.stats };
  }

  /**
   * Clear all indexed documents
   */
  async clearIndex(): Promise<void> {
    await getRetrieverService().clear();
    logger.info('Document index cleared');
  }
}

// Export singleton instance
export const documentIndexer = new DocumentIndexerService(); 