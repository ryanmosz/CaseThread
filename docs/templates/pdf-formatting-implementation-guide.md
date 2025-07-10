# PDF Formatting Implementation Guide

## Quick Reference: Formatting by Document Type

### Government Filings (Strict Requirements)
1. **Provisional Patent Application**
   - Double-spaced body text
   - Paragraph numbers ([0001], [0002])
   - Simple signature line

2. **Trademark Application**
   - Form-based (less relevant for PDF)
   - Single-spaced where applicable
   - Electronic signature format

3. **Office Action Response**
   - Double-spaced remarks section
   - 1.5" top margin
   - Application number in header

### Legal Agreements (Professional Standards)
4. **NDA (IP-Specific)**
   - Single-spaced
   - Side-by-side signatures for mutual
   - Section numbers (1., 1.1, etc.)

5. **Patent Assignment Agreement**
   - 1.5 or double-spaced (for recording)
   - Notary blocks for assignor
   - "Patent Assignment" header

6. **Patent License Agreement**
   - Single-spaced with section breaks
   - Complex signature blocks
   - May need table of contents

7. **Technology Transfer Agreement**
   - Single-spaced with section breaks
   - Multiple signature pages
   - Comprehensive structure

### Correspondence
8. **Cease and Desist Letter**
   - Single-spaced
   - Law firm letterhead space
   - Professional letter format

---

## Simplified MVP Requirements

### Core Formatting Features Needed

**1. Line Spacing Options**
```javascript
const LineSpacing = {
  SINGLE: 1.0,      // Agreements, Letters
  ONE_HALF: 1.5,    // Some patents
  DOUBLE: 2.0       // USPTO filings, office actions
};
```

**2. Document Categories**
```javascript
const DocumentCategory = {
  USPTO_FILING: ['provisional-patent', 'trademark-app', 'office-action'],
  AGREEMENT: ['nda', 'patent-assignment', 'patent-license', 'tech-transfer'],
  LETTER: ['cease-desist']
};
```

**3. Spacing Rules by Document**
```javascript
const spacingRules = {
  'provisional-patent': LineSpacing.DOUBLE,
  'office-action': LineSpacing.DOUBLE,
  'trademark-app': LineSpacing.SINGLE,
  'nda': LineSpacing.SINGLE,
  'patent-assignment': LineSpacing.ONE_HALF,
  'patent-license': LineSpacing.SINGLE,
  'tech-transfer': LineSpacing.SINGLE,
  'cease-desist': LineSpacing.SINGLE
};
```

### MVP Implementation Priority

**Phase 1: Basic Legal Formatting**
- [x] Letter size (8.5 x 11)
- [x] 1" margins (1.5" top for office actions)
- [x] Times New Roman 12pt
- [ ] Single vs double spacing per document type
- [ ] Page numbers (bottom center)
- [ ] Basic signature block positioning

**Phase 2: Document-Specific Features**
- [ ] Paragraph numbering for patents
- [ ] Headers for office actions
- [ ] Side-by-side signatures for mutual agreements
- [ ] Notary blocks for assignments

**Phase 3: Professional Polish**
- [ ] Letterhead space for law firms
- [ ] Table of contents for long agreements
- [ ] Widow/orphan control
- [ ] Keep signature blocks together

---

## Signature Block Requirements Summary

### Simple Signatures (USPTO Filings)
```
_____________________
[Name]
Date: _______________
```

### Professional Letter
```
Sincerely,

_____________________
[Attorney Name]
[Title]
[Bar Number]
```

### Side-by-Side (Mutual Agreements)
```
PARTY A:                    PARTY B:

_____________________      _____________________
By: [Name]                  By: [Name]
Title: [Title]              Title: [Title]
Date: _______________       Date: _______________
```

### Notarized (Patent Assignment)
```
ASSIGNOR:

_____________________
[Name]
Date: _______________

STATE OF _____________ )
                      ) ss.
COUNTY OF ___________ )

[Notary Block]
```

---

## Critical Implementation Notes

### 1. Line Spacing Implementation
- Body paragraphs: Apply document-specific spacing
- Signature blocks: ALWAYS single-spaced
- Block quotes: ALWAYS single-spaced
- Lists: Follow body spacing

### 2. Page Break Rules
- NEVER break a signature block
- NEVER separate notary from signature
- Keep short sections together (< 5 lines)
- OK to break long paragraphs

### 3. Special Cases
- **Office Actions**: Need special header on each page
- **Patent Apps**: Consider paragraph numbering
- **Assignments**: Extra space for recording stamps

### 4. What We DON'T Need (MVP)
- Complex headers/footers
- Automatic table of contents
- Cross-references
- Footnotes
- Multiple columns
- Watermarks

---

## Testing Checklist

For each document type, verify:
- [ ] Correct line spacing applied
- [ ] Signature blocks properly formatted
- [ ] Page numbers appear correctly
- [ ] No signature blocks split across pages
- [ ] Margins are consistent
- [ ] Font is Times New Roman 12pt

## Next Steps

1. Implement basic spacing rules
2. Test with all 8 document types
3. Add signature block page-break protection
4. Refine based on demo feedback 