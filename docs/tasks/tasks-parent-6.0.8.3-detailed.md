# Task 6.0.8.3: Implement Integration Tests

## Overview
Create end-to-end integration tests that verify the complete PDF generation workflow in the Electron GUI, from button click to PDF display.

## Current State
- Unit tests cover individual components
- IPC handlers tested in isolation
- No end-to-end workflow tests exist
- GUI automation testing not configured

## Implementation Details

### 1. Setup Spectron for Electron Testing
File: `__tests__/integration/setup/spectron-setup.ts`

```typescript
import { Application } from 'spectron';
import * as path from 'path';
import * as fs from 'fs-extra';

export class ElectronTestApp {
  private app: Application;
  private testWorkspace: string;

  constructor() {
    this.testWorkspace = path.join(__dirname, '../test-workspace');
  }

  async start(): Promise<Application> {
    // Clean test workspace
    await fs.ensureDir(this.testWorkspace);
    await fs.emptyDir(this.testWorkspace);

    // Setup test data
    await this.setupTestData();

    this.app = new Application({
      path: path.join(__dirname, '../../../node_modules/.bin/electron'),
      args: [path.join(__dirname, '../../../dist/main/index.js')],
      env: {
        NODE_ENV: 'test',
        TEST_WORKSPACE: this.testWorkspace,
        DISABLE_AUTO_UPDATE: 'true',
        LOG_LEVEL: 'debug'
      },
      startTimeout: 10000,
      waitTimeout: 10000
    });

    await this.app.start();
    await this.app.client.waitUntilWindowLoaded();

    return this.app;
  }

  async stop(): Promise<void> {
    if (this.app && this.app.isRunning()) {
      await this.app.stop();
    }
    
    // Cleanup test workspace
    await fs.remove(this.testWorkspace);
  }

  private async setupTestData(): Promise<void> {
    // Copy test documents
    const testDocs = [
      'patent-assignment-test.yaml',
      'trademark-application-test.yaml',
      'nda-test.yaml'
    ];

    for (const doc of testDocs) {
      await fs.copy(
        path.join(__dirname, '../fixtures', doc),
        path.join(this.testWorkspace, doc)
      );
    }
  }

  getApp(): Application {
    return this.app;
  }

  getWorkspacePath(): string {
    return this.testWorkspace;
  }
}

export async function waitForElement(
  app: Application,
  selector: string,
  timeout: number = 5000
): Promise<void> {
  await app.client.waitForExist(selector, timeout);
}

export async function clickElement(
  app: Application,
  selector: string
): Promise<void> {
  await waitForElement(app, selector);
  await app.client.click(selector);
}

export async function getElementText(
  app: Application,
  selector: string
): Promise<string> {
  await waitForElement(app, selector);
  return app.client.getText(selector);
}
```

### 2. PDF Generation Workflow Test
File: `__tests__/integration/pdf-generation-workflow.test.ts`

```typescript
import { ElectronTestApp, clickElement, waitForElement, getElementText } from './setup/spectron-setup';
import * as path from 'path';

describe('PDF Generation Workflow', () => {
  let testApp: ElectronTestApp;
  let app: Application;

  beforeAll(async () => {
    testApp = new ElectronTestApp();
    app = await testApp.start();
  }, 30000);

  afterAll(async () => {
    await testApp.stop();
  });

  beforeEach(async () => {
    // Reset to initial state
    await app.client.execute(() => {
      // Clear any existing PDFs
      window.electronAPI.clearState();
    });
  });

  test('should generate PDF from document', async () => {
    // 1. Open a test document
    await clickElement(app, '[data-testid="file-menu"]');
    await clickElement(app, '[data-testid="open-file"]');
    
    // Select test document
    await app.client.execute((filePath: string) => {
      window.electronAPI.openFile(filePath);
    }, path.join(testApp.getWorkspacePath(), 'patent-assignment-test.yaml'));

    // Wait for document to load
    await waitForElement(app, '[data-testid="document-viewer"]');
    
    // 2. Click Generate PDF button
    await clickElement(app, '[data-testid="generate-pdf-button"]');

    // 3. Wait for PDF generation to complete
    await waitForElement(app, '[data-testid="pdf-success-toast"]', 10000);

    // 4. Verify PDF view toggle is available
    await waitForElement(app, '[data-testid="view-mode-toggle"]');

    // 5. Switch to PDF view
    await clickElement(app, '[data-testid="pdf-view-button"]');

    // 6. Verify PDF viewer is displayed
    await waitForElement(app, '[data-testid="pdf-viewer"]');

    // 7. Verify PDF metadata
    const pageCount = await getElementText(app, '[data-testid="pdf-page-count"]');
    expect(pageCount).toMatch(/\d+ pages/);

    // 8. Test PDF navigation
    const nextButton = await app.client.isExisting('[data-testid="pdf-next-page"]');
    expect(nextButton).toBe(true);
  }, 30000);

  test('should handle PDF generation errors gracefully', async () => {
    // Open invalid document
    await app.client.execute(() => {
      // Set invalid document content
      window.electronAPI.setDocumentContent({
        content: '',
        templateId: 'invalid-template'
      });
    });

    // Try to generate PDF
    await clickElement(app, '[data-testid="generate-pdf-button"]');

    // Should show error toast
    await waitForElement(app, '[data-testid="pdf-error-toast"]');
    
    const errorMessage = await getElementText(app, '[data-testid="pdf-error-message"]');
    expect(errorMessage).toContain('Failed to generate PDF');

    // PDF view toggle should not appear
    const hasToggle = await app.client.isExisting('[data-testid="view-mode-toggle"]');
    expect(hasToggle).toBe(false);
  });

  test('should export PDF to file system', async () => {
    // Generate PDF first
    await app.client.execute((filePath: string) => {
      window.electronAPI.openFile(filePath);
    }, path.join(testApp.getWorkspacePath(), 'trademark-application-test.yaml'));

    await clickElement(app, '[data-testid="generate-pdf-button"]');
    await waitForElement(app, '[data-testid="pdf-success-toast"]');

    // Click export button
    await clickElement(app, '[data-testid="export-pdf-button"]');

    // Mock file dialog to auto-select path
    const exportPath = path.join(testApp.getWorkspacePath(), 'exported.pdf');
    await app.client.execute((path: string) => {
      window.electronAPI.mockSaveDialog(path);
    }, exportPath);

    // Wait for export completion
    await waitForElement(app, '[data-testid="export-success-toast"]');

    // Verify file exists
    const fileExists = await app.client.execute((path: string) => {
      return window.electronAPI.fileExists(path);
    }, exportPath);

    expect(fileExists).toBe(true);
  });

  test('should show progress during PDF generation', async () => {
    // Open large document
    await app.client.execute(() => {
      // Create large document that takes time to process
      const largeContent = Array(1000).fill('# Section\n\nLorem ipsum...').join('\n');
      window.electronAPI.setDocumentContent({
        content: largeContent,
        templateId: 'patent-assignment'
      });
    });

    // Start PDF generation
    await clickElement(app, '[data-testid="generate-pdf-button"]');

    // Check progress indicator appears
    await waitForElement(app, '[data-testid="pdf-progress-bar"]');

    // Verify progress updates
    let progressValue = '0';
    let attempts = 0;
    
    while (progressValue !== '100' && attempts < 20) {
      progressValue = await app.client.getAttribute(
        '[data-testid="pdf-progress-bar"]',
        'aria-valuenow'
      );
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    expect(parseInt(progressValue)).toBeGreaterThan(0);

    // Wait for completion
    await waitForElement(app, '[data-testid="pdf-success-toast"]', 15000);
  });
});
```

### 3. PDF View Mode Integration Test
File: `__tests__/integration/pdf-view-mode.test.ts`

```typescript
describe('PDF View Mode Integration', () => {
  let testApp: ElectronTestApp;
  let app: Application;

  beforeAll(async () => {
    testApp = new ElectronTestApp();
    app = await testApp.start();
    
    // Generate a PDF for testing
    await generateTestPDF(app, testApp);
  }, 30000);

  afterAll(async () => {
    await testApp.stop();
  });

  test('should switch between text and PDF views', async () => {
    // Start in text view
    const textView = await app.client.isVisible('[data-testid="text-editor"]');
    expect(textView).toBe(true);

    // Switch to PDF view
    await clickElement(app, '[data-testid="pdf-view-button"]');

    // Verify PDF viewer is shown
    await waitForElement(app, '[data-testid="pdf-viewer"]');
    const pdfVisible = await app.client.isVisible('[data-testid="pdf-viewer"]');
    expect(pdfVisible).toBe(true);

    // Text editor should be hidden
    const textHidden = await app.client.isVisible('[data-testid="text-editor"]');
    expect(textHidden).toBe(false);

    // Switch back to text view
    await clickElement(app, '[data-testid="text-view-button"]');

    // Verify text editor is shown again
    const textVisibleAgain = await app.client.isVisible('[data-testid="text-editor"]');
    expect(textVisibleAgain).toBe(true);
  });

  test('should maintain view mode when switching documents', async () => {
    // Set to PDF view
    await clickElement(app, '[data-testid="pdf-view-button"]');

    // Open different document
    await app.client.execute((filePath: string) => {
      window.electronAPI.openFile(filePath);
    }, path.join(testApp.getWorkspacePath(), 'nda-test.yaml'));

    // Generate PDF for new document
    await clickElement(app, '[data-testid="generate-pdf-button"]');
    await waitForElement(app, '[data-testid="pdf-success-toast"]');

    // Should still be in PDF view
    const pdfViewActive = await app.client.getAttribute(
      '[data-testid="pdf-view-button"]',
      'aria-pressed'
    );
    expect(pdfViewActive).toBe('true');
  });

  test('should navigate PDF pages', async () => {
    // Switch to PDF view
    await clickElement(app, '[data-testid="pdf-view-button"]');

    // Get initial page
    const initialPage = await getElementText(app, '[data-testid="pdf-current-page"]');
    expect(initialPage).toBe('1');

    // Navigate to next page
    await clickElement(app, '[data-testid="pdf-next-page"]');

    // Verify page changed
    const currentPage = await getElementText(app, '[data-testid="pdf-current-page"]');
    expect(currentPage).toBe('2');

    // Navigate back
    await clickElement(app, '[data-testid="pdf-prev-page"]');
    
    const backToFirst = await getElementText(app, '[data-testid="pdf-current-page"]');
    expect(backToFirst).toBe('1');
  });

  test('should zoom PDF', async () => {
    await clickElement(app, '[data-testid="pdf-view-button"]');

    // Get initial zoom
    const initialZoom = await getElementText(app, '[data-testid="pdf-zoom-level"]');
    expect(initialZoom).toBe('100%');

    // Zoom in
    await clickElement(app, '[data-testid="pdf-zoom-in"]');
    
    const zoomedIn = await getElementText(app, '[data-testid="pdf-zoom-level"]');
    expect(zoomedIn).toBe('125%');

    // Zoom out
    await clickElement(app, '[data-testid="pdf-zoom-out"]');
    await clickElement(app, '[data-testid="pdf-zoom-out"]');

    const zoomedOut = await getElementText(app, '[data-testid="pdf-zoom-level"]');
    expect(zoomedOut).toBe('75%');

    // Fit to page
    await clickElement(app, '[data-testid="pdf-fit-page"]');
    
    const fitted = await getElementText(app, '[data-testid="pdf-zoom-level"]');
    expect(fitted).toMatch(/\d+%/);
  });
});

async function generateTestPDF(app: Application, testApp: ElectronTestApp): Promise<void> {
  await app.client.execute((filePath: string) => {
    window.electronAPI.openFile(filePath);
  }, path.join(testApp.getWorkspacePath(), 'patent-assignment-test.yaml'));

  await clickElement(app, '[data-testid="generate-pdf-button"]');
  await waitForElement(app, '[data-testid="pdf-success-toast"]');
}
```

### 4. Quality Pipeline Integration Test
File: `__tests__/integration/quality-pipeline-integration.test.ts`

```typescript
describe('Quality Pipeline PDF Integration', () => {
  let testApp: ElectronTestApp;
  let app: Application;

  beforeAll(async () => {
    testApp = new ElectronTestApp();
    app = await testApp.start();
  }, 30000);

  afterAll(async () => {
    await testApp.stop();
  });

  test('should generate PDF through quality pipeline', async () => {
    // Enable quality pipeline mode
    await clickElement(app, '[data-testid="settings-menu"]');
    await clickElement(app, '[data-testid="quality-pipeline-toggle"]');

    // Open document
    await app.client.execute((filePath: string) => {
      window.electronAPI.openFile(filePath);
    }, path.join(testApp.getWorkspacePath(), 'patent-assignment-test.yaml'));

    // Generate with quality pipeline
    await clickElement(app, '[data-testid="generate-pdf-button"]');

    // Should show multi-stage progress
    await waitForElement(app, '[data-testid="pipeline-stage-indicator"]');

    // Verify stages progress
    const stages = [
      'context-building',
      'drafting',
      'review',
      'pdf-generation'
    ];

    for (const stage of stages) {
      await waitForElement(app, `[data-testid="stage-${stage}-active"]`, 30000);
      
      const stageStatus = await app.client.getAttribute(
        `[data-testid="stage-${stage}"]`,
        'data-status'
      );
      
      // Wait for stage completion
      await app.client.waitUntil(async () => {
        const status = await app.client.getAttribute(
          `[data-testid="stage-${stage}"]`,
          'data-status'
        );
        return status === 'complete';
      }, 30000);
    }

    // Verify final PDF is generated
    await waitForElement(app, '[data-testid="pdf-success-toast"]');
    
    // Should have quality score
    const qualityScore = await getElementText(app, '[data-testid="quality-score"]');
    expect(qualityScore).toMatch(/Quality Score: \d+\/100/);
  });

  test('should handle pipeline errors gracefully', async () => {
    // Enable quality pipeline
    await app.client.execute(() => {
      window.electronAPI.enableQualityPipeline();
    });

    // Set up document that will fail quality checks
    await app.client.execute(() => {
      window.electronAPI.setDocumentContent({
        content: 'Invalid content',
        templateId: 'patent-assignment',
        metadata: {} // Missing required metadata
      });
    });

    // Try to generate
    await clickElement(app, '[data-testid="generate-pdf-button"]');

    // Should show pipeline error
    await waitForElement(app, '[data-testid="pipeline-error"]');

    const errorStage = await getElementText(app, '[data-testid="failed-stage"]');
    expect(errorStage).toContain('context-building');

    // Should show retry option
    await waitForElement(app, '[data-testid="retry-pipeline-button"]');
  });
});
```

### 5. Memory and Performance Test
File: `__tests__/integration/pdf-performance.test.ts`

```typescript
describe('PDF Performance and Memory', () => {
  let testApp: ElectronTestApp;
  let app: Application;

  beforeAll(async () => {
    testApp = new ElectronTestApp();
    app = await testApp.start();
  }, 30000);

  afterAll(async () => {
    await testApp.stop();
  });

  test('should handle multiple PDF generations without memory leaks', async () => {
    const initialMemory = await app.client.execute(() => {
      return window.performance.memory.usedJSHeapSize;
    });

    // Generate multiple PDFs
    for (let i = 0; i < 5; i++) {
      await app.client.execute((content: string) => {
        window.electronAPI.setDocumentContent({
          content: content,
          templateId: 'nda-ip-specific'
        });
      }, `# Test Document ${i}\n\nContent for document ${i}`);

      await clickElement(app, '[data-testid="generate-pdf-button"]');
      await waitForElement(app, '[data-testid="pdf-success-toast"]');

      // Clear previous PDF
      await app.client.execute(() => {
        window.electronAPI.clearPDF();
      });
    }

    // Force garbage collection
    await app.client.execute(() => {
      if (global.gc) {
        global.gc();
      }
    });

    // Check memory hasn't grown excessively
    const finalMemory = await app.client.execute(() => {
      return window.performance.memory.usedJSHeapSize;
    });

    const memoryGrowth = finalMemory - initialMemory;
    const growthPercentage = (memoryGrowth / initialMemory) * 100;

    // Memory growth should be less than 50%
    expect(growthPercentage).toBeLessThan(50);
  });

  test('should clean up blob URLs properly', async () => {
    const initialBlobCount = await app.client.execute(() => {
      return window.electronAPI.getBlobUrlCount();
    });

    // Generate and view multiple PDFs
    for (let i = 0; i < 3; i++) {
      await generateTestPDF(app, testApp);
      await clickElement(app, '[data-testid="pdf-view-button"]');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await clickElement(app, '[data-testid="text-view-button"]');
    }

    const finalBlobCount = await app.client.execute(() => {
      return window.electronAPI.getBlobUrlCount();
    });

    // All blob URLs should be cleaned up
    expect(finalBlobCount).toBe(initialBlobCount);
  });

  test('should handle large PDFs efficiently', async () => {
    // Create large document
    const largeContent = Array(500)
      .fill('# Chapter\n\n' + 'Lorem ipsum '.repeat(1000))
      .join('\n\n');

    await app.client.execute((content: string) => {
      window.electronAPI.setDocumentContent({
        content: content,
        templateId: 'technology-transfer-agreement'
      });
    }, largeContent);

    const startTime = Date.now();

    // Generate PDF
    await clickElement(app, '[data-testid="generate-pdf-button"]');
    await waitForElement(app, '[data-testid="pdf-success-toast"]', 60000);

    const generationTime = Date.now() - startTime;

    // Should complete within reasonable time (60 seconds)
    expect(generationTime).toBeLessThan(60000);

    // PDF should be viewable
    await clickElement(app, '[data-testid="pdf-view-button"]');
    await waitForElement(app, '[data-testid="pdf-viewer"]');

    // Navigation should be responsive
    const navStartTime = Date.now();
    await clickElement(app, '[data-testid="pdf-next-page"]');
    const navTime = Date.now() - navStartTime;

    // Page navigation should be fast (< 500ms)
    expect(navTime).toBeLessThan(500);
  });
});
```

### 6. Test Configuration
File: `jest.integration.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/integration/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/integration/setup/jest.setup.ts'],
  testTimeout: 60000,
  maxWorkers: 1, // Run tests serially
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true
      }
    }
  }
};
```

### 7. Test Fixtures
File: `__tests__/integration/fixtures/patent-assignment-test.yaml`

```yaml
documentType: patent-assignment-agreement
parties:
  assignor:
    name: "Test Inventor"
    address: "123 Test St, Test City, TC 12345"
  assignee:
    name: "Test Company Inc."
    address: "456 Corporate Blvd, Business City, BC 67890"
patent:
  title: "Test Patent for Integration Testing"
  applicationNumber: "12/345,678"
  filingDate: "2024-01-01"
consideration:
  amount: "$10,000"
  paymentTerms: "Upon execution"
```

## Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test suite
npm run test:integration -- pdf-generation-workflow

# Run with debugging
npm run test:integration:debug

# Run with coverage
npm run test:integration:coverage
```

## CI/CD Integration

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macOS-latest]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          CI: true
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: integration-test-results-${{ matrix.os }}
          path: test-results/
```

## Acceptance Criteria
- [ ] End-to-end PDF generation workflow tested
- [ ] View mode switching tested
- [ ] PDF navigation and controls tested
- [ ] Quality pipeline integration tested
- [ ] Performance and memory usage tested
- [ ] All tests pass on CI/CD
- [ ] Test coverage > 70% for integration scenarios

## Notes
- Use Spectron or Playwright for Electron testing
- Mock external services for consistent tests
- Test on all supported platforms
- Monitor test execution time
- Add visual regression tests for PDF output 