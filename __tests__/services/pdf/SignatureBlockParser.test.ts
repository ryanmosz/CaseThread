import { SignatureBlockParser } from '../../../src/services/pdf/SignatureBlockParser';
import { SignatureBlockData } from '../../../src/types/pdf';

describe('SignatureBlockParser', () => {
  let parser: SignatureBlockParser;

  beforeEach(() => {
    parser = new SignatureBlockParser();
  });

  describe('class instantiation', () => {
    it('should create an instance of SignatureBlockParser', () => {
      expect(parser).toBeInstanceOf(SignatureBlockParser);
    });

    it('should have parseDocument method', () => {
      expect(parser.parseDocument).toBeDefined();
      expect(typeof parser.parseDocument).toBe('function');
    });
  });

  describe('basic marker detection', () => {
    it('should detect a signature block marker', () => {
      const text = 'Some content\n[SIGNATURE_BLOCK:assignor-signature]\nMore content';
      const result = parser.parseDocument(text);
      
      expect(result.hasSignatures).toBe(true);
      expect(result.signatureBlocks).toHaveLength(1);
      expect(result.signatureBlocks[0].marker.type).toBe('signature');
      expect(result.signatureBlocks[0].marker.id).toBe('assignor-signature');
    });

    it('should detect an initials block marker', () => {
      const text = 'Some content\n[INITIALS_BLOCK:licensee-initial]\nMore content';
      const result = parser.parseDocument(text);
      
      expect(result.hasSignatures).toBe(true);
      expect(result.signatureBlocks).toHaveLength(1);
      expect(result.signatureBlocks[0].marker.type).toBe('initial');
      expect(result.signatureBlocks[0].marker.id).toBe('licensee-initial');
    });

    it('should detect a notary block marker', () => {
      const text = 'Some content\n[NOTARY_BLOCK:assignor-notary]\nMore content';
      const result = parser.parseDocument(text);
      
      expect(result.hasSignatures).toBe(true);
      expect(result.signatureBlocks).toHaveLength(1);
      expect(result.signatureBlocks[0].marker.type).toBe('notary');
      expect(result.signatureBlocks[0].marker.id).toBe('assignor-notary');
      expect(result.signatureBlocks[0].notaryRequired).toBe(true);
    });

    it('should handle documents with no signature markers', () => {
      const text = 'This is a document without any signature markers.\nJust regular content.';
      const result = parser.parseDocument(text);
      
      expect(result.hasSignatures).toBe(false);
      expect(result.signatureBlocks).toHaveLength(0);
      expect(result.content).toEqual([
        'This is a document without any signature markers.',
        'Just regular content.'
      ]);
    });

    it('should detect multiple markers in a document', () => {
      const text = `First section
[SIGNATURE_BLOCK:party1-signature]
Some content
[SIGNATURE_BLOCK:party2-signature]
More content
[INITIALS_BLOCK:party1-initial]
End of document`;
      
      const result = parser.parseDocument(text);
      
      expect(result.hasSignatures).toBe(true);
      expect(result.signatureBlocks).toHaveLength(3);
      expect(result.signatureBlocks[0].marker.id).toBe('party1-signature');
      expect(result.signatureBlocks[1].marker.id).toBe('party2-signature');
      expect(result.signatureBlocks[2].marker.id).toBe('party1-initial');
    });

    it('should store marker position information', () => {
      const text = 'Start\n[SIGNATURE_BLOCK:test-signature]\nEnd';
      const result = parser.parseDocument(text);
      
      const marker = result.signatureBlocks[0].marker;
      expect(marker.fullMarker).toBe('[SIGNATURE_BLOCK:test-signature]');
      expect(marker.startIndex).toBeDefined();
      expect(marker.endIndex).toBeDefined();
      expect(marker.endIndex).toBeGreaterThan(marker.startIndex);
    });
  });

  describe('enhanced marker detection', () => {
    it('should validate kebab-case marker IDs', () => {
      const validText = '[SIGNATURE_BLOCK:valid-kebab-case]\n[SIGNATURE_BLOCK:also-valid]';
      const result = parser.parseDocument(validText);
      
      expect(result.signatureBlocks).toHaveLength(2);
      expect(result.signatureBlocks[0].marker.id).toBe('valid-kebab-case');
      expect(result.signatureBlocks[1].marker.id).toBe('also-valid');
    });

    it('should reject invalid marker IDs', () => {
      // We can't directly test the warning, but we can test that invalid IDs are handled
      const invalidText = '[SIGNATURE_BLOCK:Invalid_ID]\n[SIGNATURE_BLOCK:123-numbers]\n[SIGNATURE_BLOCK:UPPERCASE]';
      const result = parser.parseDocument(invalidText);
      
      // Invalid IDs should be filtered out by validation
      expect(result.signatureBlocks).toHaveLength(0);
    });

    it('should accept valid IDs and reject invalid ones in mixed content', () => {
      const mixedText = `[SIGNATURE_BLOCK:valid-id]
[SIGNATURE_BLOCK:Invalid_ID]
[SIGNATURE_BLOCK:another-valid-id]
[SIGNATURE_BLOCK:123-starts-with-number]
[SIGNATURE_BLOCK:also-valid]`;
      
      const result = parser.parseDocument(mixedText);
      
      // Should only accept the 3 valid IDs
      expect(result.signatureBlocks).toHaveLength(3);
      expect(result.signatureBlocks[0].marker.id).toBe('valid-id');
      expect(result.signatureBlocks[1].marker.id).toBe('another-valid-id');
      expect(result.signatureBlocks[2].marker.id).toBe('also-valid');
    });

    it('should detect markers with various ID formats', () => {
      const text = `[SIGNATURE_BLOCK:assignor-signature]
[SIGNATURE_BLOCK:licensee-signature]
[INITIALS_BLOCK:assignor-initial]
[NOTARY_BLOCK:assignor-notary]
[SIGNATURE_BLOCK:witness-1]
[SIGNATURE_BLOCK:witness-2]`;
      
      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks).toHaveLength(6);
      expect(result.signatureBlocks[0].marker.id).toBe('assignor-signature');
      expect(result.signatureBlocks[4].marker.id).toBe('witness-1');
      expect(result.signatureBlocks[5].marker.id).toBe('witness-2');
    });

    it('should handle markers in the middle of lines', () => {
      const text = 'Some text [SIGNATURE_BLOCK:inline-marker] more text';
      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks).toHaveLength(1);
      expect(result.signatureBlocks[0].marker.id).toBe('inline-marker');
      expect(result.signatureBlocks[0].marker.startIndex).toBe(10);
      
      // Check that the content is cleaned properly
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toBe('Some text  more text');
    });

    it('should handle multiple markers on the same line', () => {
      const text = '[SIGNATURE_BLOCK:first] [SIGNATURE_BLOCK:second]';
      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks).toHaveLength(2);
      expect(result.signatureBlocks[0].marker.id).toBe('first');
      expect(result.signatureBlocks[1].marker.id).toBe('second');
    });

    it('should detect all three marker types in mixed content', () => {
      const text = `Legal document content here.

[SIGNATURE_BLOCK:party-a-signature]

Some more content.

[INITIALS_BLOCK:party-a-initial]

Additional terms.

[NOTARY_BLOCK:notary-public]

Final content.`;
      
      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks).toHaveLength(3);
      expect(result.signatureBlocks[0].marker.type).toBe('signature');
      expect(result.signatureBlocks[1].marker.type).toBe('initial');
      expect(result.signatureBlocks[2].marker.type).toBe('notary');
    });
  });

  describe('marker context extraction', () => {
    it('should extract party information from marker IDs', () => {
      const text = `[SIGNATURE_BLOCK:assignor-signature]
[SIGNATURE_BLOCK:assignee-signature]
[SIGNATURE_BLOCK:licensor-signature]
[SIGNATURE_BLOCK:licensee-signature]`;
      
      const result = parser.parseDocument(text);
      
      // Context extraction will be tested indirectly when it's integrated
      expect(result.signatureBlocks).toHaveLength(4);
    });

    it('should handle position numbers in marker IDs', () => {
      const text = `[SIGNATURE_BLOCK:inventor-1]
[SIGNATURE_BLOCK:inventor-2]
[SIGNATURE_BLOCK:inventor-3]`;
      
      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks).toHaveLength(3);
      // Position extraction will be validated when integrated
    });

    it('should handle complex role names', () => {
      const text = `[SIGNATURE_BLOCK:technology-transfer-provider]
[SIGNATURE_BLOCK:patent-license-holder]`;
      
      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks).toHaveLength(2);
    });
  });

  describe('signature block content extraction', () => {
    it('should extract single column signature block content', () => {
      const text = `Document content here.

[SIGNATURE_BLOCK:assignor-signature]
ASSIGNOR:

_______________________
Name: John Doe
Title: CEO
Company: TechCorp Inc.

More content after block.`;
      
      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks).toHaveLength(1);
      const block = result.signatureBlocks[0];
      expect(block.layout).toBe('single');
      expect(block.parties).toHaveLength(1);
      expect(block.parties[0].role).toBe('ASSIGNOR');
      expect(block.parties[0].name).toBe('John Doe');
      expect(block.parties[0].title).toBe('CEO');
      expect(block.parties[0].company).toBe('TechCorp Inc.');
      expect(block.parties[0].lineType).toBe('signature');
    });

    it('should detect and parse side-by-side layout', () => {
      const text = `[SIGNATURE_BLOCK:mutual-signature]
DISCLOSING PARTY:                    RECEIVING PARTY:

_______________________             _______________________
Name: Alice Smith                   Name: Bob Johnson
Title: VP Engineering               Title: Director of Operations`;
      
      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks).toHaveLength(1);
      const block = result.signatureBlocks[0];
      expect(block.layout).toBe('side-by-side');
      expect(block.parties).toHaveLength(2);
      
      // Check left party
      expect(block.parties[0].role).toBe('DISCLOSING PARTY');
      expect(block.parties[0].name).toBe('Alice Smith');
      expect(block.parties[0].title).toBe('VP Engineering');
      
      // Check right party
      expect(block.parties[1].role).toBe('RECEIVING PARTY');
      expect(block.parties[1].name).toBe('Bob Johnson');
      expect(block.parties[1].title).toBe('Director of Operations');
    });

    it('should handle side-by-side layout with tabs', () => {
      const text = `[SIGNATURE_BLOCK:tabbed-signature]
LICENSOR:\t\t\tLICENSEE:
_______________________\t\t_______________________
Name: Tech Innovations\t\tName: StartupCo`;
      
      const result = parser.parseDocument(text);
      
      const block = result.signatureBlocks[0];
      expect(block.layout).toBe('side-by-side');
      expect(block.parties).toHaveLength(2);
    });

    it('should detect end of block at empty line', () => {
      const text = `[SIGNATURE_BLOCK:test]
PARTY:
_______________________
Name: Test User

Next section content here.`;
      
      const result = parser.parseDocument(text);
      
      const block = result.signatureBlocks[0];
      expect(block.parties).toHaveLength(1);
      expect(result.content).toContain('Next section content here.');
    });

    it('should detect end of block at section header', () => {
      const text = `[SIGNATURE_BLOCK:test]
ASSIGNOR:
_______________________
TERMS AND CONDITIONS:
This is a new section.`;
      
      const result = parser.parseDocument(text);
      
      const block = result.signatureBlocks[0];
      expect(block.parties).toHaveLength(1);
      expect(result.content).toContain('TERMS AND CONDITIONS:');
    });

    it('should handle multiple signatures in single column', () => {
      const text = `[SIGNATURE_BLOCK:multiple-parties]
ASSIGNOR:
_______________________
Name: John Doe

ASSIGNEE:
_______________________
Name: Jane Smith
Title: President`;
      
      const result = parser.parseDocument(text);
      
      const block = result.signatureBlocks[0];
      expect(block.parties).toHaveLength(2);
      expect(block.parties[0].role).toBe('ASSIGNOR');
      expect(block.parties[0].name).toBe('John Doe');
      expect(block.parties[1].role).toBe('ASSIGNEE');
      expect(block.parties[1].name).toBe('Jane Smith');
      expect(block.parties[1].title).toBe('President');
    });

    it('should handle case-insensitive field names', () => {
      const text = `[SIGNATURE_BLOCK:case-test]
PARTY:
_______________________
name: Test User
TITLE: Manager
Company: Tech Corp`;
      
      const result = parser.parseDocument(text);
      
      const party = result.signatureBlocks[0].parties[0];
      expect(party.name).toBe('Test User');
      expect(party.title).toBe('Manager');
      expect(party.company).toBe('Tech Corp');
    });

    it('should handle signature blocks followed by another marker', () => {
      const text = `[SIGNATURE_BLOCK:first]
PARTY A:
_______________________
Name: Alice
[SIGNATURE_BLOCK:second]
PARTY B:
_______________________
Name: Bob`;
      
      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks).toHaveLength(2);
      expect(result.signatureBlocks[0].parties[0].name).toBe('Alice');
      expect(result.signatureBlocks[1].parties[0].name).toBe('Bob');
    });

    it('should handle initial blocks with simpler format', () => {
      const text = `[INITIALS_BLOCK:party-initial]
ASSIGNOR: ______
ASSIGNEE: ______`;
      
      const result = parser.parseDocument(text);
      
      const block = result.signatureBlocks[0];
      expect(block.marker.type).toBe('initial');
      expect(block.parties).toHaveLength(2);
      expect(block.parties[0].role).toBe('ASSIGNOR');
      expect(block.parties[1].role).toBe('ASSIGNEE');
    });

    it('should preserve document content while removing markers', () => {
      const text = `Introduction paragraph.

[SIGNATURE_BLOCK:test]
PARTY:
_______________________

Conclusion paragraph.`;
      
      const result = parser.parseDocument(text);
      
      expect(result.content).toEqual([
        'Introduction paragraph.',
        '',
        'Conclusion paragraph.'
      ]);
    });

    it('should handle blocks with no party information', () => {
      const text = `[SIGNATURE_BLOCK:empty]

Some other content`;
      
      const result = parser.parseDocument(text);
      
      const block = result.signatureBlocks[0];
      expect(block.parties).toHaveLength(0);
    });

    it('should not consume lines past the signature block', () => {
      const text = `[SIGNATURE_BLOCK:test]
PARTY:
_______________________

Important content that should not be consumed.
This should remain in the document.`;
      
      const result = parser.parseDocument(text);
      
      expect(result.content).toContain('Important content that should not be consumed.');
      expect(result.content).toContain('This should remain in the document.');
    });
  });

  describe('parseDocument return structure', () => {
    it('should return cleaned content without marker lines', () => {
      const text = `Line 1
[SIGNATURE_BLOCK:test]
Line 2
Line 3`;
      
      const result = parser.parseDocument(text);
      
      expect(result.content).toEqual([
        'Line 1',
        'Line 2',
        'Line 3'
      ]);
    });

    it('should initialize signature blocks with default values', () => {
      const text = '[SIGNATURE_BLOCK:test]';
      const result = parser.parseDocument(text);
      
      const block = result.signatureBlocks[0];
      expect(block.parties).toEqual([]);
      expect(block.layout).toBe('single'); // Default from placeholder
      expect(block.notaryRequired).toBe(false); // Only true for notary blocks
    });

    it('should remove lines that contain only markers', () => {
      const text = `Line 1
[SIGNATURE_BLOCK:test]
Line 2
[INITIALS_BLOCK:test-initial]
Line 3`;
      
      const result = parser.parseDocument(text);
      
      expect(result.content).toEqual([
        'Line 1',
        'Line 2',
        'Line 3'
      ]);
      expect(result.signatureBlocks).toHaveLength(2);
    });
  });

  describe('type-specific block handling', () => {
    it('should extract date fields from signature blocks', () => {
      const text = `[SIGNATURE_BLOCK:dated-signature]
ASSIGNOR:
_______________________
Name: John Doe
Date: January 15, 2024`;
      
      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks).toHaveLength(1);
      const party = result.signatureBlocks[0].parties[0];
      expect(party.name).toBe('John Doe');
      expect(party.date).toBe('January 15, 2024');
    });

    it('should handle short initial lines', () => {
      const text = `[INITIALS_BLOCK:short-initials]
_____
_____`;
      
      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks).toHaveLength(1);
      const block = result.signatureBlocks[0];
      expect(block.marker.type).toBe('initial');
      expect(block.parties).toHaveLength(2);
      expect(block.parties[0].lineType).toBe('initial');
      expect(block.parties[1].lineType).toBe('initial');
    });

    it('should extract notary-specific information', () => {
      const text = `[NOTARY_BLOCK:notary-acknowledgment]
State of California
County of Santa Clara

_______________________
Notary Public: Jane Smith
My commission expires: December 31, 2025
Commission #: 12345678
[SEAL]`;
      
      const result = parser.parseDocument(text);
      
      expect(result.signatureBlocks).toHaveLength(1);
      const block = result.signatureBlocks[0];
      expect(block.notaryRequired).toBe(true);
      expect(block.parties).toHaveLength(1);
      
      const notary = block.parties[0];
      expect(notary.role).toBe('NOTARY PUBLIC');
      expect(notary.name).toBe('Jane Smith');
      expect(notary.notaryState).toBe('California');
      expect(notary.notaryCounty).toBe('Santa Clara');
      expect(notary.commissionExpires).toBe('December 31, 2025');
      expect(notary.commissionNumber).toBe('12345678');
    });

    it('should handle alternative name labels', () => {
      const text = `[SIGNATURE_BLOCK:alternative-labels]
PARTY:
_______________________
By: John Smith
Printed Name: John Smith
Title: CEO`;
      
      const result = parser.parseDocument(text);
      
      const party = result.signatureBlocks[0].parties[0];
      expect(party.name).toBe('John Smith');
      expect(party.title).toBe('CEO');
    });

    it('should set lineType based on block type', () => {
      const signatureText = `[SIGNATURE_BLOCK:sig]
PARTY:
_______________________`;
      
      const initialText = `[INITIALS_BLOCK:init]
PARTY:
_____`;
      
      const sigResult = parser.parseDocument(signatureText);
      const initResult = parser.parseDocument(initialText);
      
      expect(sigResult.signatureBlocks[0].parties[0].lineType).toBe('signature');
      expect(initResult.signatureBlocks[0].parties[0].lineType).toBe('initial');
    });

    it('should only parse notary content in notary blocks', () => {
      const text = `[SIGNATURE_BLOCK:not-notary]
ASSIGNOR:
State of California
County of Santa Clara
_______________________
Name: John Doe`;
      
      const result = parser.parseDocument(text);
      
      const party = result.signatureBlocks[0].parties[0];
      expect(party.role).toBe('ASSIGNOR');
      expect(party.name).toBe('John Doe');
      expect(party.notaryState).toBeUndefined();
      expect(party.notaryCounty).toBeUndefined();
    });

    it('should handle side-by-side initial blocks', () => {
      const text = `[INITIALS_BLOCK:side-by-side-initials]
DISCLOSING PARTY: _____     RECEIVING PARTY: _____`;
      
      const result = parser.parseDocument(text);
      
      const block = result.signatureBlocks[0];
      expect(block.layout).toBe('side-by-side');
      expect(block.parties).toHaveLength(2);
      expect(block.parties[0].role).toBe('DISCLOSING PARTY');
      expect(block.parties[0].lineType).toBe('initial');
      expect(block.parties[1].role).toBe('RECEIVING PARTY');
      expect(block.parties[1].lineType).toBe('initial');
    });
  });

  describe('layout analysis', () => {
    it('should analyze single column layout', () => {
      const blockData: SignatureBlockData = {
        marker: { 
          type: 'signature', 
          id: 'test', 
          fullMarker: '[SIGNATURE_BLOCK:test]', 
          startIndex: 0, 
          endIndex: 0 
        },
        layout: 'single',
        parties: [{ role: 'ASSIGNOR', lineType: 'signature' }],
        notaryRequired: false
      };
      
      const layout = parser.analyzeLayout(blockData);
      
      expect(layout.columns).toBe(1);
      expect(layout.columnWidth).toBe(468); // 612 - 144 (2 * 72)
      expect(layout.spacing).toBe(0);
      expect(layout.alignment).toBe('left');
    });

    it('should analyze side-by-side layout', () => {
      const blockData: SignatureBlockData = {
        marker: { 
          type: 'signature', 
          id: 'test', 
          fullMarker: '[SIGNATURE_BLOCK:test]', 
          startIndex: 0, 
          endIndex: 0 
        },
        layout: 'side-by-side',
        parties: [
          { role: 'PARTY A', lineType: 'signature' },
          { role: 'PARTY B', lineType: 'signature' }
        ],
        notaryRequired: false
      };
      
      const layout = parser.analyzeLayout(blockData);
      
      expect(layout.columns).toBe(2);
      expect(layout.columnWidth).toBe(209); // (468 - 50) / 2
      expect(layout.spacing).toBe(50);
      expect(layout.alignment).toBe('left');
    });

    it('should calculate block height for simple signature', () => {
      const blockData: SignatureBlockData = {
        marker: { 
          type: 'signature', 
          id: 'test', 
          fullMarker: '[SIGNATURE_BLOCK:test]', 
          startIndex: 0, 
          endIndex: 0 
        },
        layout: 'single',
        parties: [{
          role: 'ASSIGNOR',
          name: 'John Doe',
          lineType: 'signature'
        }],
        notaryRequired: false
      };
      
      const height = parser.calculateBlockHeight(blockData);
      
      // signatureLine (30) + nameLine (20) + padding (20) = 70
      expect(height).toBe(70);
    });

    it('should calculate block height with all fields', () => {
      const blockData: SignatureBlockData = {
        marker: { 
          type: 'signature', 
          id: 'test', 
          fullMarker: '[SIGNATURE_BLOCK:test]', 
          startIndex: 0, 
          endIndex: 0 
        },
        layout: 'single',
        parties: [{
          role: 'ASSIGNOR',
          name: 'John Doe',
          title: 'CEO',
          company: 'TechCorp',
          date: 'January 15, 2024',
          lineType: 'signature'
        }],
        notaryRequired: false
      };
      
      const height = parser.calculateBlockHeight(blockData);
      
      // signatureLine (30) + name (20) + title (20) + company (20) + date (20) + padding (20) = 130
      expect(height).toBe(130);
    });

    it('should add extra height for notary blocks', () => {
      const blockData: SignatureBlockData = {
        marker: { 
          type: 'notary', 
          id: 'test-notary', 
          fullMarker: '[NOTARY_BLOCK:test-notary]', 
          startIndex: 0, 
          endIndex: 0 
        },
        layout: 'single',
        parties: [{
          role: 'NOTARY PUBLIC',
          name: 'Jane Smith',
          lineType: 'signature'
        }],
        notaryRequired: true
      };
      
      const height = parser.calculateBlockHeight(blockData);
      
      // Base height (70) + notary text (80) + notary signature (30) + commission (40) + seal (20) = 240
      expect(height).toBe(240);
    });

    it('should group related blocks', () => {
      const blocks: SignatureBlockData[] = [
        {
          marker: { 
            type: 'signature', 
            id: 'assignor-signature', 
            fullMarker: '[SIGNATURE_BLOCK:assignor-signature]', 
            startIndex: 0, 
            endIndex: 0 
          },
          layout: 'single',
          parties: [{ role: 'ASSIGNOR', lineType: 'signature' }],
          notaryRequired: false
        },
        {
          marker: { 
            type: 'notary', 
            id: 'assignor-notary', 
            fullMarker: '[NOTARY_BLOCK:assignor-notary]', 
            startIndex: 0, 
            endIndex: 0 
          },
          layout: 'single',
          parties: [{ role: 'NOTARY PUBLIC', lineType: 'signature' }],
          notaryRequired: true
        },
        {
          marker: { 
            type: 'signature', 
            id: 'assignee-signature', 
            fullMarker: '[SIGNATURE_BLOCK:assignee-signature]', 
            startIndex: 0, 
            endIndex: 0 
          },
          layout: 'single',
          parties: [{ role: 'ASSIGNEE', lineType: 'signature' }],
          notaryRequired: false
        }
      ];
      
      const groups = parser.groupRelatedBlocks(blocks);
      
      expect(groups).toHaveLength(2);
      expect(groups[0]).toHaveLength(2); // assignor signature + notary
      expect(groups[1]).toHaveLength(1); // assignee signature
      
      // Verify assignor blocks are grouped
      const assignorGroup = groups.find(g => 
        g.some(b => b.marker.id === 'assignor-signature')
      );
      expect(assignorGroup).toBeDefined();
      expect(assignorGroup!.map(b => b.marker.id)).toContain('assignor-signature');
      expect(assignorGroup!.map(b => b.marker.id)).toContain('assignor-notary');
    });

    it('should calculate group height', () => {
      const group: SignatureBlockData[] = [
        {
          marker: { 
            type: 'signature', 
            id: 'test-signature', 
            fullMarker: '[SIGNATURE_BLOCK:test-signature]', 
            startIndex: 0, 
            endIndex: 0 
          },
          layout: 'single',
          parties: [{ role: 'PARTY', name: 'John Doe', lineType: 'signature' }],
          notaryRequired: false
        },
        {
          marker: { 
            type: 'notary', 
            id: 'test-notary', 
            fullMarker: '[NOTARY_BLOCK:test-notary]', 
            startIndex: 0, 
            endIndex: 0 
          },
          layout: 'single',
          parties: [{ role: 'NOTARY PUBLIC', lineType: 'signature' }],
          notaryRequired: true
        }
      ];
      
      const groupHeight = parser.calculateGroupHeight(group);
      
      // First block (70) + spacing (30) + second block (240) = 340
      expect(groupHeight).toBe(340);
    });

    it('should determine placement strategy for regular blocks', () => {
      const blockData: SignatureBlockData = {
        marker: { 
          type: 'signature', 
          id: 'test', 
          fullMarker: '[SIGNATURE_BLOCK:test]', 
          startIndex: 0, 
          endIndex: 0 
        },
        layout: 'single',
        parties: [{ role: 'PARTY', lineType: 'signature' }],
        notaryRequired: false
      };
      
      const strategy = parser.getPlacementStrategy(blockData);
      
      expect(strategy.preventBreak).toBe(true);
      expect(strategy.minSpaceRequired).toBe(120); // height (70) + buffer (50)
      expect(strategy.preferNewPage).toBe(false);
    });

    it('should prefer new page for notary blocks', () => {
      const blockData: SignatureBlockData = {
        marker: { 
          type: 'notary', 
          id: 'test-notary', 
          fullMarker: '[NOTARY_BLOCK:test-notary]', 
          startIndex: 0, 
          endIndex: 0 
        },
        layout: 'single',
        parties: [{ role: 'NOTARY PUBLIC', lineType: 'signature' }],
        notaryRequired: true
      };
      
      const strategy = parser.getPlacementStrategy(blockData);
      
      expect(strategy.preventBreak).toBe(true);
      expect(strategy.preferNewPage).toBe(true); // Notary blocks prefer new page
    });

    it('should prefer new page for large blocks', () => {
      const blockData: SignatureBlockData = {
        marker: { 
          type: 'signature', 
          id: 'test', 
          fullMarker: '[SIGNATURE_BLOCK:test]', 
          startIndex: 0, 
          endIndex: 0 
        },
        layout: 'single',
        parties: [
          { role: 'PARTY 1', name: 'Name 1', title: 'Title 1', company: 'Company 1', lineType: 'signature' },
          { role: 'PARTY 2', name: 'Name 2', title: 'Title 2', company: 'Company 2', lineType: 'signature' },
          { role: 'PARTY 3', name: 'Name 3', title: 'Title 3', company: 'Company 3', lineType: 'signature' },
          { role: 'PARTY 4', name: 'Name 4', title: 'Title 4', company: 'Company 4', lineType: 'signature' }
        ],
        notaryRequired: false
      };
      
      const strategy = parser.getPlacementStrategy(blockData);
      
      expect(strategy.preventBreak).toBe(true);
      expect(strategy.preferNewPage).toBe(true); // Large blocks (>200) prefer new page
    });
  });
}); 