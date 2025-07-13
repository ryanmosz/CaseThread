# Task 2.9.1 Investigation: Blank Page Issues

## Problem Description
When generating PDFs, the system reports creating 2 pages in the layout phase, but PDFKit actually creates 6-7 pages with pages 2, 4, 5 being blank.

## Root Cause Analysis

### 1. Mismatch Between Layout Calculation and PDFKit Behavior
- **Layout Engine**: Calculates 2 pages based on content height
- **PDFKit Reality**: Creates 7 pages due to automatic pagination

### 2. PDFKit's Automatic Page Creation
PDFKit automatically creates new pages when:
- Text overflows the current page boundaries
- Content is written beyond the page margins
- The `text()` method is called with content that doesn't fit

### 3. Debug Log Evidence
```
Layout complete: 2 pages                    # Layout engine thinks 2 pages
Rendering page: 1 of 2                     
  debug: New page added pageNumber: 2      # PDFKit adds page 2 automatically
  debug: New page added pageNumber: 3      # PDFKit adds page 3 automatically  
  debug: New page added pageNumber: 4      # PDFKit adds page 4 automatically
Rendering page: 2 of 2
  debug: New page added pageNumber: 5      # PDFKit adds page 5 automatically
  debug: New page added pageNumber: 6      # PDFKit adds page 6 automatically
  debug: New page added pageNumber: 7      # PDFKit adds page 7 automatically
```

### 4. Why Pages Are Blank
When PDFKit automatically creates a page due to overflow:
1. The overflowing content goes to the new page
2. But our rendering logic doesn't know about these auto-created pages
3. We continue rendering as if we're still on the original page
4. This creates blank pages between our intended content

## Technical Details

### Current Flow
1. `PDFLayoutEngine.layoutDocument()` calculates page breaks based on block heights
2. Returns a `LayoutResult` with 2 pages of content blocks
3. `PDFExportService` renders each calculated page
4. During rendering, `LegalPDFGenerator.writeText()` calls PDFKit's `text()` method
5. PDFKit automatically creates new pages when content overflows
6. Our code doesn't track these auto-created pages

### The Problem Code
```typescript
// src/services/pdf/LegalPDFGenerator.ts
this.doc.text(text, {
  align: finalOptions.align,
  lineGap: finalOptions.lineGap,
  continued: finalOptions.continued
});
```

PDFKit's `text()` method automatically handles pagination, but we're not:
- Checking if content will fit before writing
- Tracking cursor position after writing
- Preventing automatic page breaks

## Solutions for Task 2.9.2

### Option 1: Prevent Automatic Pagination (Recommended)
- Check available space before writing text
- Manually control page breaks
- Use `height` option in PDFKit to limit text area

### Option 2: Track PDFKit's Pagination
- Monitor the `pageAdded` event
- Update our layout tracking when PDFKit adds pages
- Adjust our rendering logic accordingly

### Option 3: Improve Layout Calculation
- Better estimate text height including line wrapping
- Account for PDFKit's text flow behavior
- Pre-calculate exact page breaks

## Next Steps for Task 2.9.2
1. Implement space checking before text writing
2. Add manual page break control
3. Update layout engine to match PDFKit's behavior
4. Test with various document lengths 