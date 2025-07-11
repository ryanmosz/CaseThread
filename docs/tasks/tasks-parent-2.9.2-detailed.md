# Task 2.9.2 Detailed: Fix Page Break Logic

## Status: COMPLETE (Partial Fix)

## Summary
Implemented multiple improvements to reduce blank pages in PDF generation, though PDFKit's automatic pagination still causes some issues.

## Changes Made

### 1. Added Space Checking in LegalPDFGenerator
- Created `calculateTextHeight()` method using PDFKit's `heightOfString()`
- Check remaining space before writing text
- Manual page break if text won't fit
- Added height limit to text() calls to prevent overflow
- Debug logging for space calculations

### 2. Improved Page Management in PDFExportService
- Track expected vs actual page numbers
- Only call `newPage()` if PDFKit hasn't already created pages
- Added warnings when PDFKit creates extra pages
- Better handling of multi-page documents

### 3. Conservative Height Limits in PDFLayoutEngine
- Reduced max page height from 648pt to 580pt
- More conservative page creation
- Added buffer to prevent edge case overflows

### 4. Enhanced Height Calculations
- Better estimation of text wrapping
- Account for line gaps and spacing
- 20% safety buffer on calculations

## Code Changes

### src/services/pdf/LegalPDFGenerator.ts
```typescript
// Added space checking before writing
if (preventAutoPagination && text.trim().length > 0) {
  const textHeight = this.calculateTextHeight(text, finalOptions);
  const remainingSpace = this.getRemainingSpace();
  
  if (textHeight > remainingSpace && remainingSpace > 50) {
    this.newPage();
  }
}

// Added height limit to prevent overflow
this.doc.text(text, {
  height: availableHeight > 0 ? availableHeight : undefined
});
```

### src/services/pdf-export.ts
```typescript
// Better page management
let expectedPage = 1;
const currentActualPage = generator.getCurrentPage();
if (i > 0 && currentActualPage === expectedPage) {
  generator.newPage();
  expectedPage++;
}
```

### src/services/pdf/PDFLayoutEngine.ts
```typescript
// Conservative height limit
maxHeight: 580, // Conservative: ~8 inches to leave buffer for PDFKit
```

## Test Updates
- Fixed 31 failing tests by adding mock methods
- Updated expected heights from 648 to 580
- All 597 tests now passing

## Results
- **Partial Success**: Reduced blank pages from 7 to ~4 in test cases
- **PDFKit Still Auto-paginates**: When our calculations are off
- **Improved but Not Perfect**: Need different approach for complete fix

## Lessons Learned
1. PDFKit's auto-pagination is hard to prevent completely
2. Height calculations need to match PDFKit's internal algorithm exactly
3. Conservative limits help but don't eliminate the problem

## Next Steps (Task 2.9.3)
1. Consider two-pass rendering (measure first, then render)
2. Use PDFKit's text measurement APIs more extensively
3. Or accept PDFKit's pagination and work with it instead 