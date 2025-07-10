# Task 2.1 Detailed: Install and Configure PDFKit

**Part of Parent Task 2.0: Create Core PDF Generation Service with Legal Formatting**

## Overview

This subtask sets up PDFKit as our PDF generation library within the CaseThread Docker environment. PDFKit is a JavaScript PDF generation library for Node.js that provides programmatic control over PDF creation, perfect for legal document formatting requirements.

## Sub-tasks

### 2.1.1 Install PDFKit and TypeScript types

**Description**: Add PDFKit to the project dependencies along with TypeScript type definitions.

**Implementation Steps**:

1. Enter the Docker container:
```bash
docker exec -it casethread-dev /bin/bash
```

2. Install PDFKit and types:
```bash
npm install pdfkit
npm install --save-dev @types/pdfkit
```

3. Verify installation in package.json:
```json
"dependencies": {
  // ... existing dependencies
  "pdfkit": "^0.15.0"
},
"devDependencies": {
  // ... existing devDependencies
  "@types/pdfkit": "^0.13.4"
}
```

**Testing**: Run `npm list pdfkit` to confirm installation.

**Definition of Done**: PDFKit appears in package.json and node_modules.

### 2.1.2 Verify PDFKit works in Docker container

**Description**: Ensure PDFKit functions correctly within our Alpine Linux Docker environment.

**Implementation Steps**:

1. Create a test script `src/scripts/test-pdfkit.ts`:
```typescript
import PDFDocument from 'pdfkit';
import * as fs from 'fs';

console.log('Testing PDFKit in Docker...');

try {
  // Create a document
  const doc = new PDFDocument();
  
  // Pipe to a file
  doc.pipe(fs.createWriteStream('test-output.pdf'));
  
  // Add content
  doc.fontSize(12)
     .text('PDFKit is working in Docker!', 100, 100);
  
  // Finalize
  doc.end();
  
  console.log('✓ PDFKit test successful! Check test-output.pdf');
} catch (error) {
  console.error('✗ PDFKit test failed:', error);
  process.exit(1);
}
```

2. Run the test:
```bash
npx ts-node src/scripts/test-pdfkit.ts
```

3. Verify the PDF was created:
```bash
ls -la test-output.pdf
```

**Testing**: Open test-output.pdf to verify it contains the test text.

**Definition of Done**: Test script runs without errors and produces a valid PDF.

### 2.1.3 Create basic PDF test to validate setup

**Description**: Create a proper test file to ensure PDFKit integrates with our testing framework.

**Implementation Steps**:

1. Create test file `__tests__/services/pdf/pdfkit-setup.test.ts`:
```typescript
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

describe('PDFKit Setup Validation', () => {
  const testOutputDir = path.join(__dirname, '../../../test-output');
  
  beforeAll(() => {
    // Create test output directory if it doesn't exist
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup test files
    const testFile = path.join(testOutputDir, 'pdfkit-test.pdf');
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  it('should create a PDF document with PDFKit', (done) => {
    const outputPath = path.join(testOutputDir, 'pdfkit-test.pdf');
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(outputPath);
    
    doc.pipe(stream);
    
    // Add test content
    doc.fontSize(12)
       .font('Times-Roman')
       .text('PDFKit Test Document', 72, 72);
    
    doc.end();
    
    stream.on('finish', () => {
      // Verify file exists and has content
      expect(fs.existsSync(outputPath)).toBe(true);
      const stats = fs.statSync(outputPath);
      expect(stats.size).toBeGreaterThan(0);
      done();
    });
  });

  it('should support Times-Roman font', () => {
    const doc = new PDFDocument();
    
    // This should not throw
    expect(() => {
      doc.font('Times-Roman');
    }).not.toThrow();
  });

  it('should handle page size configuration', () => {
    const doc = new PDFDocument({
      size: 'LETTER', // 8.5 x 11 inches
      margins: {
        top: 72,    // 1 inch = 72 points
        bottom: 72,
        left: 72,
        right: 72
      }
    });
    
    // Check page dimensions (in points)
    expect(doc.page.width).toBe(612);  // 8.5 * 72
    expect(doc.page.height).toBe(792); // 11 * 72
  });
});
```

2. Add test output directory to .gitignore:
```bash
echo "test-output/" >> .gitignore
```

3. Run the test:
```bash
npm test -- __tests__/services/pdf/pdfkit-setup.test.ts
```

**Testing**: All tests should pass, confirming PDFKit is properly integrated.

**Definition of Done**: Test suite passes with 3 successful tests.

### 2.1.4 Update tech stack documentation

**Description**: Document PDFKit addition to the project's tech stack.

**Implementation Steps**:

1. Update `docs/architecture/tech-stack.md`:
```markdown
### PDF Generation
- **PDFKit** (v0.15.x) - JavaScript PDF generation library
  - Pure JavaScript implementation
  - No system dependencies required
  - Built-in font support
  - Programmatic PDF creation
```

2. Add to the dependencies section:
```markdown
### Document Processing
- **PDFKit** - PDF generation for legal documents
  - Letter size support
  - Custom margins and spacing
  - Times Roman font
  - Page numbering capabilities
```

3. Update the Architecture Patterns section:
```markdown
### PDF Generation Layer
PDF creation separated into services:
- `LegalPDFGenerator.ts` - Main PDF generation logic
- `DocumentFormatter.ts` - Formatting rules by document type
- `SignatureBlockParser.ts` - Signature marker parsing
```

**Testing**: Review the updated documentation for accuracy.

**Definition of Done**: Tech stack documentation includes PDFKit details.

## Common Pitfalls

1. **Font Issues**: PDFKit includes standard fonts but custom fonts need special handling
2. **Memory Leaks**: Always call `doc.end()` to properly close the document
3. **File Paths**: Use absolute paths or ensure working directory is correct
4. **Stream Handling**: Wait for 'finish' event before reading generated PDFs
5. **Docker Permissions**: Ensure output directories are writable

## File Changes

- **Modified**:
  - `package.json` - Added pdfkit dependencies
  - `package-lock.json` - Updated with pdfkit
  - `.gitignore` - Added test-output directory
  - `docs/architecture/tech-stack.md` - Documented PDFKit
  
- **Created**:
  - `src/scripts/test-pdfkit.ts` - Validation script (can be deleted after testing)
  - `__tests__/services/pdf/pdfkit-setup.test.ts` - Integration test

## Dependencies

- Requires Node.js environment (provided by Docker)
- No system-level dependencies needed (PDFKit is pure JavaScript)

## Next Steps

After completing this setup:
1. Move to Task 2.2: Create Base PDF Generator Class
2. Delete the temporary test script `src/scripts/test-pdfkit.ts`
3. Keep the test file for regression testing

## Success Criteria

- [ ] PDFKit installed with TypeScript types
- [ ] Test PDF generated successfully in Docker
- [ ] Integration test passing
- [ ] Documentation updated
- [ ] No errors in npm install or test runs 