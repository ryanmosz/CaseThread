# Known Problems and Limitations

This document tracks known issues and limitations in the CaseThread system as of July 12, 2025.

## 1. HTML Entities in Generated Documents

**Problem**: Some generated documents contain HTML entities (like `&nbsp;`) that appear as raw text in the PDF output.

**Affected Documents**: 
- office-action-response (dates and section headers)
- nda-ip-specific (dates)

**Examples**:
- `Filed: October&nbsp;20,&nbsp;2023` appears instead of `Filed: October 20, 2023`
- `Section&nbsp;1: Introduction` appears instead of `Section 1: Introduction`

**Root Cause**: The AI model (OpenAI/GPT) inserts HTML entities when trying to:
- Keep dates together on one line
- Create precise indentation
- Maintain specific formatting

**Status**: Document generation issue - not a PDF export problem

**Potential Solutions**:
- Instruct the AI to avoid HTML entities in prompts
- Add HTML entity decoding to the generation pipeline
- Have the PDF export service decode common HTML entities as a safety net

---

## 2. Signature Block Formatting Issues

**Problem**: Signature blocks are appearing without proper formatting:
- Missing vertical spacing to allow room for actual signatures
- No actual signature lines/guidelines for humans to sign on

**Affected Documents**: All documents with signature blocks

**Current State**: 
- Signature blocks show the text labels (name, title, date) but lack the visual line elements
- Insufficient vertical space between signature elements

**Status**: Unknown whether this is a generation or export issue - requires investigation

**Visual Impact**: Documents appear unprofessional and are not ready for actual signing

---

*Last Updated: July 12, 2025* 