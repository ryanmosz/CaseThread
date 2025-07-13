# Task 6.0.8.4: Test All 8 Document Types

## Overview
Create comprehensive tests to ensure PDF generation works correctly for all 8 legal document types in the system, verifying formatting, content accuracy, and template compliance.

## Current State
- 8 document templates exist in the system
- Basic CLI tests exist for documents
- No GUI-specific document type testing
- PDF output not validated for each type

## Document Types to Test
1. Provisional Patent Application
2. NDA (IP-Specific)
3. Patent License Agreement
4. Trademark Application
5. Patent Assignment Agreement
6. Technology Transfer Agreement
7. Office Action Response
8. Cease and Desist Letter

## Implementation Details

### 1. Document Type Test Suite
File: `__tests__/integration/document-types/all-documents.test.ts`

```typescript
import { ElectronTestApp, clickElement, waitForElement, getElementText } from '../setup/spectron-setup';
import { validatePDFContent } from '../helpers/pdf-validator';
import * as path from 'path';
import * as fs from 'fs-extra';

const DOCUMENT_TYPES = [
  {
    id: 'provisional-patent-application',
    name: 'Provisional Patent Application',
    fixture: 'provisional-patent-test.yaml',
    expectedSections: ['SPECIFICATION', 'CLAIMS', 'ABSTRACT'],
    minPages: 5,
    maxPages: 15
  },
  {
    id: 'nda-ip-specific',
    name: 'NDA (IP-Specific)',
    fixture: 'nda-ip-test.yaml',
    expectedSections: ['CONFIDENTIAL INFORMATION', 'OBLIGATIONS', 'TERM'],
    minPages: 3,
    maxPages: 8
  },
  {
    id: 'patent-license-agreement',
    name: 'Patent License Agreement',
    fixture: 'patent-license-test.yaml',
    expectedSections: ['GRANT OF LICENSE', 'ROYALTIES', 'TERRITORY'],
    minPages: 8,
    maxPages: 20
  },
  {
    id: 'trademark-application',
    name: 'Trademark Application',
    fixture: 'trademark-test.yaml',
    expectedSections: ['MARK INFORMATION', 'GOODS AND SERVICES', 'SPECIMEN'],
    minPages: 3,
    maxPages: 10
  },
  {
    id: 'patent-assignment-agreement',
    name: 'Patent Assignment Agreement',
    fixture: 'patent-assignment-test.yaml',
    expectedSections: ['ASSIGNMENT', 'CONSIDERATION', 'WARRANTIES'],
    minPages: 4,
    maxPages: 10
  },
  {
    id: 'technology-transfer-agreement',
    name: 'Technology Transfer Agreement',
    fixture: 'tech-transfer-test.yaml',
    expectedSections: ['TECHNOLOGY DESCRIPTION', 'TRANSFER TERMS', 'SUPPORT'],
    minPages: 10,
    maxPages: 25
  },
  {
    id: 'office-action-response',
    name: 'Office Action Response',
    fixture: 'office-action-test.yaml',
    expectedSections: ['RESPONSE TO REJECTIONS', 'CLAIM AMENDMENTS', 'REMARKS'],
    minPages: 5,
    maxPages: 20
  },
  {
    id: 'cease-and-desist-letter',
    name: 'Cease and Desist Letter',
    fixture: 'cease-desist-test.yaml',
    expectedSections: ['INFRINGEMENT NOTICE', 'DEMANDS', 'CONSEQUENCES'],
    minPages: 2,
    maxPages: 6
  }
];

describe('All Document Types PDF Generation', () => {
  let testApp: ElectronTestApp;
  let app: Application;

  beforeAll(async () => {
    testApp = new ElectronTestApp();
    app = await testApp.start();
  }, 30000);

  afterAll(async () => {
    await testApp.stop();
  });

  describe.each(DOCUMENT_TYPES)('$name PDF Generation', (docType) => {
    let generatedPDFPath: string;

    beforeEach(async () => {
      // Clear any existing state
      await app.client.execute(() => {
        window.electronAPI.clearState();
      });
    });

    test(`should generate valid PDF for ${docType.name}`, async () => {
      // Load test document
      const fixturePath = path.join(testApp.getWorkspacePath(), docType.fixture);
      await app.client.execute((filePath: string) => {
        window.electronAPI.openFile(filePath);
      }, fixturePath);

      // Wait for document to load
      await waitForElement(app, '[data-testid="document-viewer"]');

      // Generate PDF
      await clickElement(app, '[data-testid="generate-pdf-button"]');

      // Wait for generation to complete
      await waitForElement(app, '[data-testid="pdf-success-toast"]', 30000);

      // Verify success message
      const successMessage = await getElementText(app, '[data-testid="toast-message"]');
      expect(successMessage).toContain('PDF Generated Successfully');

      // Switch to PDF view
      await clickElement(app, '[data-testid="pdf-view-button"]');
      await waitForElement(app, '[data-testid="pdf-viewer"]');

      // Get PDF metadata
      const pageCount = await getElementText(app, '[data-testid="pdf-page-count"]');
      const pages = parseInt(pageCount.match(/(\d+) pages/)?.[1] || '0');

      // Verify page count is within expected range
      expect(pages).toBeGreaterThanOrEqual(docType.minPages);
      expect(pages).toBeLessThanOrEqual(docType.maxPages);

      // Export PDF for content validation
      await clickElement(app, '[data-testid="export-pdf-button"]');
      
      generatedPDFPath = path.join(
        testApp.getWorkspacePath(),
        `${docType.id}-test.pdf`
      );

      await app.client.execute((path: string) => {
        window.electronAPI.mockSaveDialog(path);
      }, generatedPDFPath);

      await waitForElement(app, '[data-testid="export-success-toast"]');
    }, 60000);

    test(`should contain required sections for ${docType.name}`, async () => {
      // Validate PDF content
      const pdfContent = await validatePDFContent(generatedPDFPath);

      // Check for required sections
      for (const section of docType.expectedSections) {
        expect(pdfContent.text).toContain(section);
      }

      // Verify document title
      expect(pdfContent.metadata.Title).toContain(docType.name);
      expect(pdfContent.metadata.Creator).toBe('CaseThread');
    });

    test(`should format ${docType.name} according to template`, async () => {
      const pdfContent = await validatePDFContent(generatedPDFPath);

      // Common formatting checks
      expect(pdfContent.fonts).toContain('Times-Roman');
      expect(pdfContent.pageSize).toEqual({ width: 612, height: 792 }); // Letter size

      // Check margins (should be 1 inch = 72 points)
      const firstPage = pdfContent.pages[0];
      expect(firstPage.margins).toEqual({
        top: 72,
        bottom: 72,
        left: 72,
        right: 72
      });

      // Verify header/footer presence
      if (docType.id !== 'cease-and-desist-letter') {
        expect(pdfContent.hasPageNumbers).toBe(true);
      }
    });
  });
});
```

### 2. Document-Specific Test Files
File: `__tests__/integration/document-types/provisional-patent.test.ts`

```typescript
describe('Provisional Patent Application Specific Tests', () => {
  let testApp: ElectronTestApp;
  let app: Application;

  beforeAll(async () => {
    testApp = new ElectronTestApp();
    app = await testApp.start();
  }, 30000);

  afterAll(async () => {
    await testApp.stop();
  });

  test('should include invention drawings when provided', async () => {
    // Load provisional patent with drawings
    const fixturePath = path.join(
      testApp.getWorkspacePath(),
      'provisional-patent-with-drawings.yaml'
    );
    
    await app.client.execute((filePath: string) => {
      window.electronAPI.openFile(filePath);
    }, fixturePath);

    await clickElement(app, '[data-testid="generate-pdf-button"]');
    await waitForElement(app, '[data-testid="pdf-success-toast"]');

    // Export and validate
    const pdfPath = await exportPDF(app, testApp, 'provisional-with-drawings.pdf');
    const pdfContent = await validatePDFContent(pdfPath);

    // Check for figure references
    expect(pdfContent.text).toMatch(/FIG\. \d+/);
    expect(pdfContent.images.length).toBeGreaterThan(0);
  });

  test('should format claims with proper numbering', async () => {
    const pdfPath = await generateDocumentPDF(
      app,
      testApp,
      'provisional-patent-claims.yaml'
    );
    
    const pdfContent = await validatePDFContent(pdfPath);

    // Verify claim formatting
    const claimMatches = pdfContent.text.match(/\d+\.\s+[A-Z]/g);
    expect(claimMatches).toBeTruthy();
    expect(claimMatches!.length).toBeGreaterThanOrEqual(3);

    // Check claim dependencies
    expect(pdfContent.text).toMatch(/claim \d+, wherein/i);
  });

  test('should include proper USPTO headers', async () => {
    const pdfPath = await generateDocumentPDF(
      app,
      testApp,
      'provisional-patent-test.yaml'
    );
    
    const pdfContent = await validatePDFContent(pdfPath);

    // Check for required provisional patent headers
    expect(pdfContent.text).toContain('PROVISIONAL PATENT APPLICATION');
    expect(pdfContent.text).toMatch(/Application No\.: TBD/);
    expect(pdfContent.text).toMatch(/Filing Date:/);
  });
});
```

### 3. Signature Block Validation
File: `__tests__/integration/document-types/signature-validation.test.ts`

```typescript
describe('Document Signature Block Validation', () => {
  const DOCS_WITH_SIGNATURES = [
    { type: 'nda-ip-specific', parties: 2, style: 'standard' },
    { type: 'patent-license-agreement', parties: 2, style: 'standard' },
    { type: 'patent-assignment-agreement', parties: 2, style: 'notarized' },
    { type: 'technology-transfer-agreement', parties: 2, style: 'witnessed' }
  ];

  let testApp: ElectronTestApp;
  let app: Application;

  beforeAll(async () => {
    testApp = new ElectronTestApp();
    app = await testApp.start();
  }, 30000);

  afterAll(async () => {
    await testApp.stop();
  });

  describe.each(DOCS_WITH_SIGNATURES)('$type signature blocks', (doc) => {
    test(`should include proper signature blocks for ${doc.type}`, async () => {
      const pdfPath = await generateDocumentPDF(
        app,
        testApp,
        `${doc.type}-test.yaml`
      );
      
      const pdfContent = await validatePDFContent(pdfPath);

      // Check for signature lines
      const signatureLines = pdfContent.text.match(/_{20,}/g);
      expect(signatureLines).toBeTruthy();
      expect(signatureLines!.length).toBeGreaterThanOrEqual(doc.parties * 2); // Name + Date

      // Check for party labels
      expect(pdfContent.text).toMatch(/By:\s*_{20,}/);
      expect(pdfContent.text).toMatch(/Date:\s*_{20,}/);

      // Style-specific checks
      if (doc.style === 'notarized') {
        expect(pdfContent.text).toContain('NOTARY PUBLIC');
        expect(pdfContent.text).toMatch(/State of/i);
        expect(pdfContent.text).toMatch(/County of/i);
      }

      if (doc.style === 'witnessed') {
        expect(pdfContent.text).toContain('WITNESS');
        expect(signatureLines!.length).toBeGreaterThanOrEqual((doc.parties + 2) * 2);
      }
    });
  });
});
```

### 4. Complex Document Scenarios
File: `__tests__/integration/document-types/complex-scenarios.test.ts`

```typescript
describe('Complex Document Scenarios', () => {
  let testApp: ElectronTestApp;
  let app: Application;

  beforeAll(async () => {
    testApp = new ElectronTestApp();
    app = await testApp.start();
  }, 30000);

  afterAll(async () => {
    await testApp.stop();
  });

  test('should handle multi-party agreements correctly', async () => {
    // Test with 5+ parties
    const multiPartyDoc = {
      documentType: 'technology-transfer-agreement',
      parties: {
        transferors: [
          { name: 'Company A', address: '123 Tech St' },
          { name: 'Company B', address: '456 Innovation Ave' },
          { name: 'Company C', address: '789 Research Blvd' }
        ],
        transferees: [
          { name: 'University X', address: '321 Academic Way' },
          { name: 'Institute Y', address: '654 Science Park' }
        ]
      }
    };

    await app.client.execute((doc: any) => {
      window.electronAPI.setDocumentContent(doc);
    }, multiPartyDoc);

    const pdfPath = await generateAndExportPDF(app, testApp, 'multi-party.pdf');
    const pdfContent = await validatePDFContent(pdfPath);

    // Verify all parties are listed
    expect(pdfContent.text).toContain('Company A');
    expect(pdfContent.text).toContain('Company B');
    expect(pdfContent.text).toContain('Company C');
    expect(pdfContent.text).toContain('University X');
    expect(pdfContent.text).toContain('Institute Y');

    // Check signature blocks for all parties
    const signatureLines = pdfContent.text.match(/_{20,}/g);
    expect(signatureLines!.length).toBeGreaterThanOrEqual(10); // 5 parties × 2 lines each
  });

  test('should handle documents with exhibits', async () => {
    const docWithExhibits = {
      documentType: 'patent-license-agreement',
      exhibits: [
        { label: 'A', title: 'Licensed Patents', content: 'Patent list...' },
        { label: 'B', title: 'Royalty Schedule', content: 'Royalty terms...' },
        { label: 'C', title: 'Territory Map', content: 'Territory details...' }
      ]
    };

    await app.client.execute((doc: any) => {
      window.electronAPI.setDocumentContent(doc);
    }, docWithExhibits);

    const pdfPath = await generateAndExportPDF(app, testApp, 'with-exhibits.pdf');
    const pdfContent = await validatePDFContent(pdfPath);

    // Verify exhibit references
    expect(pdfContent.text).toContain('EXHIBIT A');
    expect(pdfContent.text).toContain('EXHIBIT B');
    expect(pdfContent.text).toContain('EXHIBIT C');

    // Check page breaks between exhibits
    expect(pdfContent.pageBreaks).toBeGreaterThanOrEqual(3);
  });

  test('should format office action responses with proper citations', async () => {
    const officeActionDoc = {
      documentType: 'office-action-response',
      citations: [
        { reference: 'Smith et al.', patent: 'US 1,234,567', relevance: '§102' },
        { reference: 'Jones', patent: 'US 2,345,678', relevance: '§103' }
      ],
      rejections: [
        { claims: '1-5', basis: '35 U.S.C. §102', reference: 'Smith' },
        { claims: '6-10', basis: '35 U.S.C. §103', reference: 'Jones' }
      ]
    };

    await app.client.execute((doc: any) => {
      window.electronAPI.setDocumentContent(doc);
    }, officeActionDoc);

    const pdfPath = await generateAndExportPDF(app, testApp, 'office-action.pdf');
    const pdfContent = await validatePDFContent(pdfPath);

    // Verify legal citations formatting
    expect(pdfContent.text).toMatch(/35 U\.S\.C\. §\d+/);
    expect(pdfContent.text).toMatch(/US \d+,\d+,\d+/);

    // Check claim groupings
    expect(pdfContent.text).toMatch(/Claims? \d+-\d+/);
  });
});
```

### 5. PDF Validation Helper
File: `__tests__/integration/helpers/pdf-validator.ts`

```typescript
import * as pdf from 'pdf-parse';
import * as fs from 'fs-extra';

export interface PDFValidationResult {
  text: string;
  pages: PageInfo[];
  metadata: PDFMetadata;
  fonts: string[];
  pageSize: { width: number; height: number };
  hasPageNumbers: boolean;
  images: ImageInfo[];
  pageBreaks: number;
}

interface PageInfo {
  number: number;
  text: string;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

interface PDFMetadata {
  Title?: string;
  Author?: string;
  Creator?: string;
  CreationDate?: Date;
}

interface ImageInfo {
  page: number;
  width: number;
  height: number;
}

export async function validatePDFContent(pdfPath: string): Promise<PDFValidationResult> {
  const dataBuffer = await fs.readFile(pdfPath);
  const data = await pdf(dataBuffer, {
    pagerender: renderPage
  });

  // Extract fonts
  const fonts = extractFonts(data);

  // Detect page numbers
  const hasPageNumbers = detectPageNumbers(data.text);

  // Extract images
  const images = await extractImages(dataBuffer);

  // Count page breaks
  const pageBreaks = (data.text.match(/\f/g) || []).length;

  return {
    text: data.text,
    pages: data.pages || [],
    metadata: data.info as PDFMetadata,
    fonts,
    pageSize: {
      width: data.info?.MediaBox?.[2] || 612,
      height: data.info?.MediaBox?.[3] || 792
    },
    hasPageNumbers,
    images,
    pageBreaks
  };
}

function renderPage(pageData: any): Promise<string> {
  // Custom page render for extracting structured content
  return new Promise((resolve) => {
    let textContent = '';
    
    if (pageData.TextContent?.items) {
      pageData.TextContent.items.forEach((item: any) => {
        textContent += item.str + ' ';
      });
    }

    resolve(textContent);
  });
}

function extractFonts(pdfData: any): string[] {
  const fonts = new Set<string>();
  
  // Extract font information from PDF structure
  if (pdfData.metadata?.Fonts) {
    Object.keys(pdfData.metadata.Fonts).forEach(font => {
      fonts.add(font);
    });
  }

  return Array.from(fonts);
}

function detectPageNumbers(text: string): boolean {
  // Common page number patterns
  const pageNumberPatterns = [
    /Page \d+ of \d+/gi,
    /\d+\s*\/\s*\d+/g,
    /- \d+ -/g
  ];

  return pageNumberPatterns.some(pattern => pattern.test(text));
}

async function extractImages(pdfBuffer: Buffer): Promise<ImageInfo[]> {
  // Simplified image extraction
  const images: ImageInfo[] = [];
  
  // This would use a proper PDF parsing library
  // For testing, we're just checking for image markers
  const bufferString = pdfBuffer.toString('binary');
  const imageMatches = bufferString.match(/\/Type\s*\/XObject\s*\/Subtype\s*\/Image/g);
  
  if (imageMatches) {
    imageMatches.forEach((_, index) => {
      images.push({
        page: Math.floor(index / 2) + 1, // Rough estimate
        width: 300,
        height: 200
      });
    });
  }

  return images;
}
```

### 6. Test Data Generator
File: `__tests__/integration/fixtures/generate-test-documents.ts`

```typescript
import * as fs from 'fs-extra';
import * as path from 'path';

const TEST_SCENARIOS = {
  basic: {
    parties: 2,
    complexity: 'simple',
    hasExhibits: false
  },
  complex: {
    parties: 5,
    complexity: 'detailed',
    hasExhibits: true
  },
  edge: {
    parties: 10,
    complexity: 'maximum',
    hasExhibits: true,
    specialCases: ['unicode', 'longNames', 'multipleAddresses']
  }
};

export async function generateTestDocuments(outputDir: string): Promise<void> {
  await fs.ensureDir(outputDir);

  for (const [docType, template] of Object.entries(DOCUMENT_TYPES)) {
    for (const [scenario, config] of Object.entries(TEST_SCENARIOS)) {
      const testDoc = generateTestDocument(docType, template, config);
      const filename = `${docType}-${scenario}.yaml`;
      
      await fs.writeFile(
        path.join(outputDir, filename),
        JSON.stringify(testDoc, null, 2)
      );
    }
  }
}

function generateTestDocument(
  type: string,
  template: any,
  config: any
): any {
  // Generate test data based on document type and scenario
  const doc: any = {
    documentType: type,
    scenario: config
  };

  // Add parties
  if (config.parties > 2) {
    doc.parties = generateMultipleParties(config.parties);
  } else {
    doc.parties = generateStandardParties();
  }

  // Add complexity-specific content
  if (config.complexity === 'detailed') {
    doc.additionalClauses = generateDetailedClauses(type);
  }

  if (config.complexity === 'maximum') {
    doc.additionalClauses = generateMaximumComplexity(type);
  }

  // Add exhibits if needed
  if (config.hasExhibits) {
    doc.exhibits = generateExhibits(type);
  }

  // Handle special cases
  if (config.specialCases) {
    applySpecialCases(doc, config.specialCases);
  }

  return doc;
}
```

### 7. Performance Benchmarking
File: `__tests__/integration/document-types/performance-benchmark.test.ts`

```typescript
describe('Document Generation Performance Benchmarks', () => {
  let testApp: ElectronTestApp;
  let app: Application;
  const benchmarks: any[] = [];

  beforeAll(async () => {
    testApp = new ElectronTestApp();
    app = await testApp.start();
  }, 30000);

  afterAll(async () => {
    await testApp.stop();
    
    // Save benchmark results
    await saveBenchmarkResults(benchmarks);
  });

  describe.each(DOCUMENT_TYPES)('$name performance', (docType) => {
    test(`should generate ${docType.name} within performance threshold`, async () => {
      const startTime = Date.now();

      // Load and generate document
      await loadDocument(app, testApp, docType.fixture);
      await clickElement(app, '[data-testid="generate-pdf-button"]');
      await waitForElement(app, '[data-testid="pdf-success-toast"]', 60000);

      const generationTime = Date.now() - startTime;

      // Record benchmark
      benchmarks.push({
        documentType: docType.id,
        generationTime,
        timestamp: new Date().toISOString()
      });

      // Performance assertions
      const threshold = getPerformanceThreshold(docType);
      expect(generationTime).toBeLessThan(threshold);

      // Memory usage check
      const memoryUsage = await app.client.execute(() => {
        return performance.memory?.usedJSHeapSize || 0;
      });

      expect(memoryUsage).toBeLessThan(500 * 1024 * 1024); // 500MB limit
    });
  });
});

function getPerformanceThreshold(docType: any): number {
  // Document-specific thresholds based on complexity
  const thresholds: Record<string, number> = {
    'cease-and-desist-letter': 5000, // 5 seconds
    'nda-ip-specific': 8000, // 8 seconds
    'trademark-application': 10000, // 10 seconds
    'provisional-patent-application': 15000, // 15 seconds
    'patent-assignment-agreement': 12000, // 12 seconds
    'office-action-response': 20000, // 20 seconds
    'patent-license-agreement': 25000, // 25 seconds
    'technology-transfer-agreement': 30000 // 30 seconds
  };

  return thresholds[docType.id] || 20000; // Default 20 seconds
}

async function saveBenchmarkResults(benchmarks: any[]): Promise<void> {
  const resultsPath = path.join(
    __dirname,
    '../../../test-results/benchmarks.json'
  );

  await fs.ensureDir(path.dirname(resultsPath));
  await fs.writeJSON(resultsPath, {
    timestamp: new Date().toISOString(),
    results: benchmarks,
    summary: calculateSummary(benchmarks)
  }, { spaces: 2 });
}
```

## Test Execution Scripts

### Run All Document Tests
File: `scripts/test-all-documents.sh`

```bash
#!/bin/bash

echo "Testing all 8 document types..."

# Run tests with detailed output
npm run test:integration -- \
  --testNamePattern="All Document Types PDF Generation" \
  --verbose \
  --coverage

# Generate report
node scripts/generate-document-test-report.js

echo "Document type testing complete!"
```

## Acceptance Criteria
- [ ] All 8 document types generate valid PDFs
- [ ] Each document contains required sections
- [ ] Formatting matches legal requirements
- [ ] Signature blocks render correctly
- [ ] Complex scenarios handled properly
- [ ] Performance within acceptable limits
- [ ] Memory usage stays within bounds

## Notes
- Test each document type individually and in bulk
- Verify legal formatting requirements
- Check signature block variations
- Test with extreme data scenarios
- Monitor performance across document types
- Validate PDF/A compliance if required 