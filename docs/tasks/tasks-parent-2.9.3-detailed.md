# Task 2.9.3 Detailed: Ensure Content Flows Properly

## Objective
Ensure that PDF content flows naturally across pages without unexpected breaks, orphaned content, or misaligned elements. Build on the partial fix from Task 2.9.2 to create a more robust solution.

## Current Issues
1. PDFKit still auto-paginates, creating extra pages
2. Content sometimes splits awkwardly mid-paragraph
3. Height calculations don't perfectly match PDFKit's rendering
4. Signature blocks may split across pages

## Subtasks

### 1. Implement Two-Pass Rendering System
- First pass: Measure all content without rendering
- Calculate exact page breaks based on measurements
- Second pass: Render with pre-calculated page breaks

### 2. Improve Text Flow Management
- Better paragraph splitting at sentence boundaries
- Ensure minimum lines before/after page breaks
- Handle widow/orphan control properly

### 3. Fix Signature Block Positioning
- Ensure signature blocks never split across pages
- Move entire block to next page if insufficient space
- Maintain proper spacing around signature blocks

### 4. Add Content Flow Validation
- Verify no content is lost during pagination
- Check for proper spacing between elements
- Ensure page numbers are correct

### 5. Test with Various Document Lengths
- Short documents (1 page)
- Medium documents (2-5 pages)
- Long documents (10+ pages)
- Documents with multiple signature blocks

## Technical Approach

### Two-Pass Rendering
```typescript
// First pass: measure everything
const measurements = await measureDocument(blocks);
const pageBreaks = calculateOptimalPageBreaks(measurements);

// Second pass: render with known breaks
await renderWithPageBreaks(blocks, pageBreaks);
```

### Smart Text Splitting
```typescript
// Split at sentence boundaries when possible
function splitTextAtBoundary(text: string, maxHeight: number): {
  firstPart: string;
  secondPart: string;
} {
  // Find sentence endings near the split point
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  // Logic to find best split point
}
```

### Signature Block Protection
```typescript
// Check if signature block fits on current page
if (remainingHeight < signatureBlockHeight + minSpaceAfter) {
  // Move entire block to next page
  generator.newPage();
}
```

## Success Criteria
- No blank pages in normal documents
- Content flows naturally across pages
- Signature blocks remain intact
- All text is readable and properly spaced
- Page numbers align with actual content

## Implementation Order
1. Start with two-pass rendering foundation
2. Add smart text splitting
3. Implement signature block protection
4. Add validation and testing
5. Fine-tune based on test results 