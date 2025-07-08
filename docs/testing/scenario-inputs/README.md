# Scenario Input Files

This directory contains 20 YAML input files that provide the necessary parameters for generating test documents using the CaseThread document generation system.

## File Structure

Each file follows the naming convention:
```
[client-abbreviation]-[sequence]-[document-type].yaml
```

### Client Abbreviations:
- `ids` - Iris Design Studio
- `rtp` - Rainbow Tales Publishing
- `cil` - ChemInnovate Labs
- `tfs` - TechFlow Solutions

## File Format

Each YAML file contains:
1. **Metadata section**: Client, attorney, document type, and template reference
2. **Document Parameters section**: All fields required to generate the specific document

Example structure:
```yaml
# Metadata
client: "TechFlow Solutions"
attorney: "Sarah Chen"
document_type: "patent-assignment-agreement"
template: "patent-assignment-agreement.json"

# Document Parameters
assignors:
  - name: "David Park"
    title: "CEO & Co-Founder"
    # ... additional fields
```

## Usage

These files are designed to be used with a command-line tool:
```bash
generate-doc --type patent-assignment --input tfs-01-patent-assignment.yaml
```

## Document Types Covered

1. **Patent Assignment Agreement** (2 files)
2. **Office Action Response** (4 files)
3. **Patent License Agreement** (2 files)
4. **Cease and Desist Letter** (2 files + 2 response variants)
5. **Trademark Application** (2 files)
6. **NDA (IP-Specific)** (3 files)
7. **Technology Transfer Agreement** (2 files)
8. **Provisional Patent Application** (1 file)
9. **Special Documents** (2 files: compliance memo, strategy memo)

## Design Principles

- **Minimal**: Only includes data required for document generation
- **Reusable**: Can be used outside of test scenarios
- **Machine-readable**: Pure YAML format for easy parsing
- **Human-readable**: Clear field names and logical structure 