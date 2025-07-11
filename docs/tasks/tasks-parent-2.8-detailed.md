# Task 2.8 Detailed Plan: Add Markdown Parsing to PDF Export

## Overview
Currently, the PDF export service treats documents as plain text. This task adds Markdown parsing to properly format documents that use Markdown syntax, converting Markdown elements to appropriate PDF formatting.

## Current State Analysis
The `PDFExportService` currently:
- Processes text line by line
- Only detects headings based on ALL CAPS or numbered sections
- Groups consecutive text into paragraphs
- Does not parse any Markdown syntax

## Subtask Plans

### 2.8.1 Parse Markdown headings (#, ##, ###) to PDF headings

**Goal**: Convert Markdown heading syntax to properly formatted PDF headings

**Implementation Plan**:
1. Create a `MarkdownParser` class in `src/services/pdf/MarkdownParser.ts`
2. Add regex patterns to detect Markdown headings:
   - `^# (.+)$` - H1 heading
   - `^## (.+)$` - H2 heading  
   - `^### (.+)$` - H3 heading
   - `^#### (.+)$` - H4 heading (and so on)
3. Update `PDFExportService.isHeading()` to also check for Markdown heading syntax
4. Modify `prepareLayoutBlocks()` to:
   - Extract heading level from Markdown syntax
   - Remove the `#` characters from the heading text
   - Pass heading level to the layout block
5. Update `LegalPDFGenerator.writeHeading()` to accept and use heading levels
6. Apply different font sizes for different heading levels:
   - H1: 16pt bold
   - H2: 14pt bold
   - H3: 12pt bold
   - H4+: 12pt normal

**Testing**:
- Create test documents with various heading levels
- Verify heading detection and level extraction
- Check PDF output has proper heading hierarchy

### 2.8.2 Parse bold/italic (**text**, *text*) to PDF formatting

**Goal**: Convert inline Markdown formatting to PDF text styles

**Implementation Plan**:
1. Add inline parsing methods to `MarkdownParser`:
   - `parseBold()` - detect `**text**` or `__text__`
   - `parseItalic()` - detect `*text*` or `_text_`
   - `parseBoldItalic()` - detect `***text***` or `___text___`
2. Create a text segment structure to handle mixed formatting:
   ```typescript
   interface TextSegment {
     text: string;
     bold?: boolean;
     italic?: boolean;
   }
   ```
3. Add `parseInlineFormatting()` method that:
   - Splits text into segments
   - Identifies formatted sections
   - Returns array of TextSegments
4. Update `LegalPDFGenerator` to add methods:
   - `writeFormattedText(segments: TextSegment[])`
   - Support for bold/italic font variants
5. Modify `PDFExportService.renderPage()` to:
   - Parse inline formatting before writing text
   - Use formatted text methods when formatting is present

**Testing**:
- Test with nested formatting (`**bold with *italic* inside**`)
- Verify edge cases (unclosed tags, escaped asterisks)
- Check PDF renders with correct font styles

### 2.8.3 Parse horizontal rules (---) to PDF lines

**Goal**: Convert Markdown horizontal rules to visual separators in PDF

**Implementation Plan**:
1. Add to `MarkdownParser`:
   - Pattern to detect horizontal rules: `^(-{3,}|_{3,}|\*{3,})$`
   - Method `isHorizontalRule(line: string): boolean`
2. Update `prepareLayoutBlocks()` to:
   - Detect horizontal rule lines
   - Create a new block type: `'horizontal-rule'`
   - Set appropriate height (e.g., 20pt)
3. Add to `LegalPDFGenerator`:
   - `drawHorizontalLine()` method
   - Use PDF line drawing capabilities
   - Respect page margins
4. Update `renderPage()` to handle horizontal rule blocks

**Testing**:
- Test different HR syntaxes (`---`, `___`, `***`)
- Verify lines don't break pages awkwardly
- Check line width respects margins

### 2.8.4 Handle other common Markdown elements

**Goal**: Support additional Markdown elements commonly used in legal documents

**Implementation Plan**:
1. **Lists (ordered and unordered)**:
   - Detect patterns: `^[-*+] (.+)$` (unordered), `^\d+\. (.+)$` (ordered)
   - Create `'list-item'` block type
   - Track list nesting level and type
   - Add indentation support to `LegalPDFGenerator`

2. **Block quotes**:
   - Detect pattern: `^> (.+)$`
   - Create `'blockquote'` block type
   - Add left margin indent in PDF
   - Use italic formatting

3. **Code blocks** (if needed):
   - Detect fenced code blocks: ` ``` `
   - Use monospace font (Courier)
   - Add light background color

4. **Links** (extract text only):
   - Pattern: `\[([^\]]+)\]\([^)]+\)`
   - Extract link text, ignore URL
   - Optionally add footnote with URL

**Testing**:
- Create comprehensive test document with all elements
- Verify proper nesting and formatting
- Check edge cases and malformed syntax

### 2.8.5 Preserve document structure without syntax characters

**Goal**: Ensure the final PDF shows formatted content without Markdown syntax

**Implementation Plan**:
1. Create comprehensive `stripMarkdownSyntax()` method that:
   - Removes all Markdown syntax characters
   - Preserves the actual content
   - Maintains document structure
2. Add configuration option to `PDFExportOptions`:
   - `parseMarkdown: boolean` (default: true)
   - Allow users to disable Markdown parsing if needed
3. Ensure all parsing is non-destructive:
   - Original text remains available
   - Syntax removal happens at render time
4. Handle edge cases:
   - Escaped characters (`\*not bold\*`)
   - Inline code (`` `code` ``)
   - Raw HTML (strip or ignore)

**Testing**:
- Compare source document with PDF content
- Verify no syntax artifacts remain
- Test with documents that use literal asterisks

## Integration Points

1. **MarkdownParser class**: New service to handle all Markdown parsing
2. **PDFExportService**: Update to use MarkdownParser
3. **LegalPDFGenerator**: Extend with new formatting methods
4. **LayoutBlock types**: Add new block types for Markdown elements
5. **Tests**: Comprehensive test suite for Markdown parsing

## Order of Implementation

1. Start with 2.8.1 (headings) - most impactful and straightforward
2. Then 2.8.2 (bold/italic) - essential for emphasis
3. Then 2.8.3 (horizontal rules) - simple but useful
4. Then 2.8.4 (lists and quotes) - nice to have
5. Finally 2.8.5 (cleanup) - ensures quality output

## Success Criteria

- All Markdown syntax is properly parsed and converted
- PDF output looks professional without syntax characters
- Formatting is consistent with legal document standards
- Performance impact is minimal
- Backward compatibility maintained (non-Markdown documents still work)
- All existing tests continue to pass
- New tests cover all Markdown parsing scenarios 