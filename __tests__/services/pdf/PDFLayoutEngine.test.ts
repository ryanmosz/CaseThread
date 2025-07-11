import { PDFLayoutEngine } from '../../../src/services/pdf/PDFLayoutEngine';
import { LegalPDFGenerator } from '../../../src/services/pdf/LegalPDFGenerator';
import { DocumentFormatter } from '../../../src/services/pdf/DocumentFormatter';
import { SignatureBlockParser } from '../../../src/services/pdf/SignatureBlockParser';
import { LayoutBlock, SignatureBlockData } from '../../../src/types/pdf';

describe('PDFLayoutEngine', () => {
  let layoutEngine: PDFLayoutEngine;
  let mockGenerator: jest.Mocked<LegalPDFGenerator>;
  let mockFormatter: jest.Mocked<DocumentFormatter>;
  let mockParser: jest.Mocked<SignatureBlockParser>;

  beforeEach(() => {
    // Create mock instances
    mockGenerator = {
      writeText: jest.fn(),
      writeParagraph: jest.fn(),
      moveTo: jest.fn(),
      getDocument: jest.fn().mockReturnValue({
        moveTo: jest.fn().mockReturnThis(),
        lineTo: jest.fn().mockReturnThis(),
        stroke: jest.fn().mockReturnThis()
      }),
      getCurrentX: jest.fn().mockReturnValue(72) // Left margin
    } as any;

    mockFormatter = {
      getUsablePageArea: jest.fn().mockReturnValue({
        width: 468,
        height: 648
      })
    } as unknown as jest.Mocked<DocumentFormatter>;

    mockParser = {
      // Add any methods needed for tests
    } as unknown as jest.Mocked<SignatureBlockParser>;

    layoutEngine = new PDFLayoutEngine(mockGenerator, mockFormatter, mockParser);
  });

  describe('constructor', () => {
    it('should create an instance of PDFLayoutEngine', () => {
      expect(layoutEngine).toBeInstanceOf(PDFLayoutEngine);
    });

    it('should accept required dependencies', () => {
      expect(() => {
        new PDFLayoutEngine(mockGenerator, mockFormatter, mockParser);
      }).not.toThrow();
    });
  });

  describe('layoutDocument', () => {
    it('should layout empty document', () => {
      const blocks: LayoutBlock[] = [];
      const result = layoutEngine.layoutDocument(blocks, 'patent-assignment-agreement');

      expect(result).toBeDefined();
      expect(result.pages).toHaveLength(0);
      expect(result.totalPages).toBe(0);
      expect(result.hasOverflow).toBe(false);
    });

    it('should layout single block that fits on one page', () => {
      const blocks: LayoutBlock[] = [
        {
          type: 'text',
          content: 'Test paragraph',
          height: 100,
          breakable: true
        }
      ];

      const result = layoutEngine.layoutDocument(blocks, 'patent-assignment-agreement');

      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].blocks).toHaveLength(1);
      expect(result.pages[0].remainingHeight).toBe(548); // 648 - 100
      expect(result.totalPages).toBe(1);
    });

    it('should create new page when block does not fit', () => {
      const blocks: LayoutBlock[] = [
        {
          type: 'text',
          content: 'Large block',
          height: 600,
          breakable: true
        },
        {
          type: 'text',
          content: 'Another block',
          height: 100,
          breakable: true
        }
      ];

      const result = layoutEngine.layoutDocument(blocks, 'patent-assignment-agreement');

      expect(result.pages).toHaveLength(2);
      expect(result.pages[0].blocks).toHaveLength(1);
      expect(result.pages[1].blocks).toHaveLength(1);
      expect(result.totalPages).toBe(2);
    });

    it('should handle signature blocks', () => {
      const blocks: LayoutBlock[] = [
        {
          type: 'signature',
          content: {
            marker: {
              type: 'signature',
              id: 'test-sig',
              fullMarker: '[SIGNATURE_BLOCK:test-sig]',
              startIndex: 0,
              endIndex: 0
            },
            layout: 'single',
            parties: [{ role: 'PARTY', lineType: 'signature' }],
            notaryRequired: false
          },
          height: 150,
          breakable: false
        }
      ];

      const result = layoutEngine.layoutDocument(blocks, 'patent-assignment-agreement');

      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].blocks).toHaveLength(1);
      expect(result.pages[0].blocks[0].type).toBe('signature');
    });

    it('should handle multiple blocks', () => {
      const blocks: LayoutBlock[] = [
        {
          type: 'heading',
          content: 'Section 1',
          height: 30,
          breakable: false,
          keepWithNext: true
        },
        {
          type: 'text',
          content: 'Paragraph 1',
          height: 100,
          breakable: true
        },
        {
          type: 'text',
          content: 'Paragraph 2',
          height: 100,
          breakable: true
        }
      ];

      const result = layoutEngine.layoutDocument(blocks, 'patent-assignment-agreement');

      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].blocks).toHaveLength(3);
      expect(result.pages[0].remainingHeight).toBe(418); // 648 - 30 - 100 - 100
    });

    it('should respect different document types', () => {
      const blocks: LayoutBlock[] = [
        {
          type: 'text',
          content: 'Test',
          height: 50,
          breakable: true
        }
      ];

      // Test with office action response (which has different first page height)
      mockFormatter.getUsablePageArea
        .mockReturnValueOnce({ width: 468, height: 576 }) // First page
        .mockReturnValueOnce({ width: 468, height: 648 }); // Second page

      const result = layoutEngine.layoutDocument(blocks, 'office-action-response');

      expect(mockFormatter.getUsablePageArea).toHaveBeenCalledWith('office-action-response', 1);
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].remainingHeight).toBe(526); // 576 - 50
    });

    it('should handle blocks that exceed page height', () => {
      const blocks: LayoutBlock[] = [
        {
          type: 'text',
          content: 'Normal block',
          height: 100,
          breakable: true
        },
        {
          type: 'text',
          content: 'Block that triggers page break',
          height: 600,
          breakable: true
        }
      ];

      const result = layoutEngine.layoutDocument(blocks, 'patent-assignment-agreement');

      expect(result.pages).toHaveLength(2);
      expect(result.pages[0].blocks).toHaveLength(1);
      expect(result.pages[1].blocks).toHaveLength(1);
    });

    it('should preserve page numbers', () => {
      const blocks: LayoutBlock[] = [
        {
          type: 'text',
          content: 'Page 1 content',
          height: 600,
          breakable: true
        },
        {
          type: 'text',
          content: 'Page 2 content',
          height: 600,
          breakable: true
        },
        {
          type: 'text',
          content: 'Page 3 content',
          height: 100,
          breakable: true
        }
      ];

      const result = layoutEngine.layoutDocument(blocks, 'patent-assignment-agreement');

      expect(result.pages).toHaveLength(3);
      expect(result.pages[0].pageNumber).toBe(1);
      expect(result.pages[1].pageNumber).toBe(2);
      expect(result.pages[2].pageNumber).toBe(3);
    });
  });

  describe('renderSignatureBlock', () => {
    beforeEach(() => {
      // Add additional mock methods for signature block rendering
      mockGenerator.getCurrentX = jest.fn().mockReturnValue(72);
      mockGenerator.getCurrentY = jest.fn().mockReturnValue(100);
      mockGenerator.moveTo = jest.fn().mockReturnValue(mockGenerator);
      mockGenerator.writeText = jest.fn().mockReturnValue(mockGenerator);
      mockGenerator.getDocument = jest.fn().mockReturnValue({
        moveTo: jest.fn().mockReturnThis(),
        lineTo: jest.fn().mockReturnThis(),
        stroke: jest.fn().mockReturnThis()
      });

      mockParser.analyzeLayout = jest.fn().mockReturnValue({
        columns: 1,
        columnWidth: 468,
        spacing: 50,
        alignment: 'left'
      });
    });

    it('should render single column signature block', () => {
      const blockData = {
        marker: {
          type: 'signature' as const,
          id: 'test',
          fullMarker: '[SIGNATURE_BLOCK:test]',
          startIndex: 0,
          endIndex: 0
        },
        layout: 'single' as const,
        parties: [
          { role: 'ASSIGNOR', name: 'John Doe', title: 'CEO' }
        ],
        notaryRequired: false
      };

      const endY = layoutEngine.renderSignatureBlock(blockData, 100);

      expect(mockParser.analyzeLayout).toHaveBeenCalledWith(blockData);
      expect(mockGenerator.writeText).toHaveBeenCalledWith('ASSIGNOR:', { fontSize: 12 });
      expect(mockGenerator.writeText).toHaveBeenCalledWith('Name: John Doe', { fontSize: 10 });
      expect(mockGenerator.writeText).toHaveBeenCalledWith('Title: CEO', { fontSize: 10 });
      expect(endY).toBeGreaterThan(100);
    });

    it('should render side-by-side signature block', () => {
      mockParser.analyzeLayout.mockReturnValue({
        columns: 2,
        columnWidth: 209,
        spacing: 50,
        alignment: 'left'
      });

      const blockData = {
        marker: {
          type: 'signature' as const,
          id: 'test',
          fullMarker: '[SIGNATURE_BLOCK:test]',
          startIndex: 0,
          endIndex: 0
        },
        layout: 'side-by-side' as const,
        parties: [
          { role: 'LICENSOR', name: 'Alice Smith' },
          { role: 'LICENSEE', name: 'Bob Jones' }
        ],
        notaryRequired: false
      };

      const endY = layoutEngine.renderSignatureBlock(blockData, 100);

      expect(mockParser.analyzeLayout).toHaveBeenCalledWith(blockData);
      expect(mockGenerator.writeText).toHaveBeenCalledWith('LICENSOR:', { fontSize: 12, align: 'left' });
      expect(mockGenerator.writeText).toHaveBeenCalledWith('LICENSEE:', { fontSize: 12, align: 'left' });
      expect(mockGenerator.writeText).toHaveBeenCalledWith('Name: Alice Smith', { fontSize: 10 });
      expect(mockGenerator.writeText).toHaveBeenCalledWith('Name: Bob Jones', { fontSize: 10 });
      expect(endY).toBeGreaterThan(100);
    });

    it('should handle parties without all fields', () => {
      const blockData = {
        marker: {
          type: 'signature' as const,
          id: 'test',
          fullMarker: '[SIGNATURE_BLOCK:test]',
          startIndex: 0,
          endIndex: 0
        },
        layout: 'single' as const,
        parties: [
          { role: 'PARTY' } // No name or title
        ],
        notaryRequired: false
      };

      const endY = layoutEngine.renderSignatureBlock(blockData, 100);

      expect(mockGenerator.writeText).toHaveBeenCalledWith('PARTY:', { fontSize: 12 });
      expect(mockGenerator.writeText).not.toHaveBeenCalledWith(expect.stringContaining('Name:'), expect.any(Object));
      expect(mockGenerator.writeText).not.toHaveBeenCalledWith(expect.stringContaining('Title:'), expect.any(Object));
      expect(endY).toBeGreaterThan(100);
    });

    it('should render notary section when required', () => {
      const blockData = {
        marker: {
          type: 'notary' as const,
          id: 'test-notary',
          fullMarker: '[NOTARY_BLOCK:test-notary]',
          startIndex: 0,
          endIndex: 0
        },
        layout: 'single' as const,
        parties: [{ role: 'NOTARY' }],
        notaryRequired: true
      };

      const endY = layoutEngine.renderSignatureBlock(blockData, 100);

      expect(mockGenerator.writeText).toHaveBeenCalledWith('STATE OF _____________', { fontSize: 10 });
      expect(mockGenerator.writeText).toHaveBeenCalledWith('COUNTY OF ___________', { fontSize: 10 });
      expect(mockGenerator.writeText).toHaveBeenCalledWith(
        'Subscribed and sworn to before me this ____ day of _________, 20__',
        { fontSize: 10 }
      );
      expect(mockGenerator.writeText).toHaveBeenCalledWith('Notary Public', { fontSize: 10 });
      expect(mockGenerator.writeText).toHaveBeenCalledWith('My Commission Expires: __________', { fontSize: 10 });
      expect(endY).toBeGreaterThan(200); // Should be significantly higher due to notary section
    });

    it('should draw signature lines', () => {
      const blockData = {
        marker: {
          type: 'signature' as const,
          id: 'test',
          fullMarker: '[SIGNATURE_BLOCK:test]',
          startIndex: 0,
          endIndex: 0
        },
        layout: 'single' as const,
        parties: [{ role: 'PARTY' }],
        notaryRequired: false
      };

      const mockDoc = mockGenerator.getDocument();
      layoutEngine.renderSignatureBlock(blockData, 100);

      expect(mockDoc.moveTo).toHaveBeenCalled();
      expect(mockDoc.lineTo).toHaveBeenCalled();
      expect(mockDoc.stroke).toHaveBeenCalled();
    });

    it('should handle multiple parties in single column', () => {
      const blockData = {
        marker: {
          type: 'signature' as const,
          id: 'test',
          fullMarker: '[SIGNATURE_BLOCK:test]',
          startIndex: 0,
          endIndex: 0
        },
        layout: 'single' as const,
        parties: [
          { role: 'PARTY A', name: 'Alice' },
          { role: 'PARTY B', name: 'Bob' },
          { role: 'PARTY C', name: 'Charlie' }
        ],
        notaryRequired: false
      };

      const endY = layoutEngine.renderSignatureBlock(blockData, 100);

      expect(mockGenerator.writeText).toHaveBeenCalledWith('PARTY A:', { fontSize: 12 });
      expect(mockGenerator.writeText).toHaveBeenCalledWith('PARTY B:', { fontSize: 12 });
      expect(mockGenerator.writeText).toHaveBeenCalledWith('PARTY C:', { fontSize: 12 });
      expect(endY).toBeGreaterThan(250); // Should be much higher with 3 parties
    });

    it('should position signature lines correctly', () => {
      const blockData = {
        marker: {
          type: 'signature' as const,
          id: 'test',
          fullMarker: '[SIGNATURE_BLOCK:test]',
          startIndex: 0,
          endIndex: 0
        },
        layout: 'single' as const,
        parties: [{ role: 'SIGNER' }],
        notaryRequired: false
      };

      layoutEngine.renderSignatureBlock(blockData, 100);

      // Check moveTo was called with correct positions
      expect(mockGenerator.moveTo).toHaveBeenCalledWith({ x: 72, y: 100 });
    });

    it('should handle side-by-side with titles', () => {
      mockParser.analyzeLayout.mockReturnValue({
        columns: 2,
        columnWidth: 209,
        spacing: 50,
        alignment: 'left'
      });

      const blockData = {
        marker: {
          type: 'signature' as const,
          id: 'test',
          fullMarker: '[SIGNATURE_BLOCK:test]',
          startIndex: 0,
          endIndex: 0
        },
        layout: 'side-by-side' as const,
        parties: [
          { role: 'ASSIGNOR', name: 'John Doe', title: 'President' },
          { role: 'ASSIGNEE', name: 'Jane Smith', title: 'CEO' }
        ],
        notaryRequired: false
      };

      const endY = layoutEngine.renderSignatureBlock(blockData, 100);

      expect(mockGenerator.writeText).toHaveBeenCalledWith('Title: President', { fontSize: 10 });
      expect(mockGenerator.writeText).toHaveBeenCalledWith('Title: CEO', { fontSize: 10 });
      expect(endY).toBeGreaterThan(100);
    });

    it('should calculate correct spacing for side-by-side layout', () => {
      mockParser.analyzeLayout.mockReturnValue({
        columns: 2,
        columnWidth: 209,
        spacing: 50,
        alignment: 'left'
      });

      const blockData = {
        marker: {
          type: 'signature' as const,
          id: 'test',
          fullMarker: '[SIGNATURE_BLOCK:test]',
          startIndex: 0,
          endIndex: 0
        },
        layout: 'side-by-side' as const,
        parties: [
          { role: 'LEFT' },
          { role: 'RIGHT' }
        ],
        notaryRequired: false
      };

      layoutEngine.renderSignatureBlock(blockData, 100);

      // Should position right column at x + columnWidth + spacing
      // Left at 72, right at 72 + 209 + 50 = 331
      const moveToCall = mockGenerator.moveTo.mock.calls.find(
        call => typeof call[0] === 'object' && call[0].x === 331
      );
      expect(moveToCall).toBeDefined();
    });
  });

  describe('page break prevention', () => {
    it('should prevent signature blocks from splitting across pages', () => {
      const blocks: LayoutBlock[] = [
        {
          type: 'text',
          content: 'Large text block',
          height: 600,
          breakable: true
        },
        {
          type: 'signature',
          content: {
            marker: {
              type: 'signature' as const,
              id: 'test',
              fullMarker: '[SIGNATURE_BLOCK:test]',
              startIndex: 0,
              endIndex: 0
            },
            layout: 'single' as const,
            parties: [{ role: 'PARTY' }],
            notaryRequired: false
          },
          height: 200,
          breakable: false
        }
      ];

      const result = layoutEngine.layoutDocument(blocks, 'patent-assignment-agreement');

      // Signature block should be on second page
      expect(result.pages).toHaveLength(2);
      expect(result.pages[0].blocks).toHaveLength(1);
      expect(result.pages[0].blocks[0].type).toBe('text');
      expect(result.pages[1].blocks).toHaveLength(1);
      expect(result.pages[1].blocks[0].type).toBe('signature');
    });

    it('should keep headings with following content', () => {
      const blocks: LayoutBlock[] = [
        {
          type: 'text',
          content: 'Fill most of page',
          height: 600,
          breakable: true
        },
        {
          type: 'heading',
          content: 'Important Section',
          height: 30,
          breakable: false,
          keepWithNext: true
        },
        {
          type: 'text',
          content: 'Content that should stay with heading',
          height: 100,
          breakable: true
        }
      ];

      const result = layoutEngine.layoutDocument(blocks, 'patent-assignment-agreement');

      // Heading and its content should be together on page 2
      expect(result.pages).toHaveLength(2);
      expect(result.pages[0].blocks).toHaveLength(1);
      expect(result.pages[1].blocks).toHaveLength(2);
      expect(result.pages[1].blocks[0].type).toBe('heading');
      expect(result.pages[1].blocks[1].type).toBe('text');
    });

    it('should handle unbreakable tables', () => {
      const blocks: LayoutBlock[] = [
        {
          type: 'text',
          content: 'Some content',
          height: 500,
          breakable: true
        },
        {
          type: 'table',
          content: 'Table data',
          height: 200,
          breakable: false
        }
      ];

      const result = layoutEngine.layoutDocument(blocks, 'patent-assignment-agreement');

      // Table should move to next page if it doesn't fit
      expect(result.pages).toHaveLength(2);
      expect(result.pages[1].blocks[0].type).toBe('table');
    });

    it('should respect orphan and widow constraints', () => {
      const blocks: LayoutBlock[] = [];
      
      // Add many small text blocks
      for (let i = 0; i < 50; i++) {
        blocks.push({
          type: 'text',
          content: `Paragraph ${i}`,
          height: 20,
          breakable: true
        });
      }

      const result = layoutEngine.layoutDocument(blocks, 'patent-assignment-agreement');

      // Check that no page has just 1 block (orphan/widow)
      for (const page of result.pages) {
        if (page !== result.pages[result.pages.length - 1]) {
          // Not the last page
          expect(page.blocks.length).toBeGreaterThanOrEqual(2);
        }
      }
    });

    it('should find optimal break points', () => {
      const blocks: LayoutBlock[] = [
        {
          type: 'heading',
          content: 'Section 1',
          height: 30,
          breakable: false,
          keepWithNext: true
        },
        {
          type: 'text',
          content: 'Section 1 content',
          height: 100,
          breakable: true
        },
        {
          type: 'text',
          content: 'More content',
          height: 500,
          breakable: true
        },
        {
          type: 'heading',
          content: 'Section 2',
          height: 30,
          breakable: false,
          keepWithNext: true
        },
        {
          type: 'text',
          content: 'Section 2 content',
          height: 100,
          breakable: true
        }
      ];

      const result = layoutEngine.layoutDocument(blocks, 'patent-assignment-agreement');

      // Should break after paragraph, not between heading and content
      expect(result.pages[0].blocks[result.pages[0].blocks.length - 1].type).toBe('text');
    });

    it('should handle blocks too large for any page', () => {
      const blocks: LayoutBlock[] = [
        {
          type: 'text',
          content: 'Extremely large block',
          height: 1000, // Larger than page
          breakable: true
        }
      ];

      const result = layoutEngine.layoutDocument(blocks, 'patent-assignment-agreement');

      // Should still add the block even though it's too large
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].blocks).toHaveLength(1);
    });

    it('should calculate group heights correctly', () => {
      const blocks: LayoutBlock[] = [
        {
          type: 'text',
          content: 'Fill page',
          height: 550, // Increased to ensure group doesn't fit
          breakable: true
        },
        {
          type: 'heading',
          content: 'Group start',
          height: 30,
          breakable: false,
          keepWithNext: true
        },
        {
          type: 'text',
          content: 'Group middle',
          height: 50,
          breakable: true,
          keepWithNext: true
        },
        {
          type: 'text',
          content: 'Group end',
          height: 50,
          breakable: true
        }
      ];

      const result = layoutEngine.layoutDocument(blocks, 'patent-assignment-agreement');

      // With first block at 550, remaining is 98 (648 - 550)
      // Group is 130 height (30 + 50 + 50), which doesn't fit
      // So entire group should move to page 2
      expect(result.pages).toHaveLength(2);
      expect(result.pages[1].blocks).toHaveLength(3);
      expect(result.pages[1].blocks[0].content).toBe('Group start');
    });

    it('should handle empty pages correctly', () => {
      const blocks: LayoutBlock[] = [
        {
          type: 'signature',
          content: {
            marker: {
              type: 'signature' as const,
              id: 'test',
              fullMarker: '[SIGNATURE_BLOCK:test]',
              startIndex: 0,
              endIndex: 0
            },
            layout: 'single' as const,
            parties: [{ role: 'PARTY' }],
            notaryRequired: false
          },
          height: 700, // Almost full page
          breakable: false
        }
      ];

      const result = layoutEngine.layoutDocument(blocks, 'patent-assignment-agreement');

      // Should place on first page even though it's large
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].blocks).toHaveLength(1);
    });

    it('should recalculate heights when moving blocks', () => {
      const blocks: LayoutBlock[] = [
        {
          type: 'text',
          content: 'Block 1',
          height: 300,
          breakable: true
        },
        {
          type: 'text',
          content: 'Block 2',
          height: 300,
          breakable: true
        },
        {
          type: 'signature',
          content: {
            marker: {
              type: 'signature' as const,
              id: 'test',
              fullMarker: '[SIGNATURE_BLOCK:test]',
              startIndex: 0,
              endIndex: 0
            },
            layout: 'single' as const,
            parties: [{ role: 'PARTY' }],
            notaryRequired: false
          },
          height: 200,
          breakable: false
        }
      ];

      const result = layoutEngine.layoutDocument(blocks, 'patent-assignment-agreement');

      // Should properly calculate remaining space
      expect(result.pages).toHaveLength(2);
      expect(result.pages[0].remainingHeight).toBeGreaterThan(0);
      expect(result.pages[1].remainingHeight).toBeGreaterThan(0);
    });

    it('should handle multiple unbreakable blocks in sequence', () => {
      const blocks: LayoutBlock[] = [
        {
          type: 'text',
          content: 'Filler',
          height: 400,
          breakable: true
        },
        {
          type: 'signature',
          content: {
            marker: {
              type: 'signature' as const,
              id: 'sig1',
              fullMarker: '[SIGNATURE_BLOCK:sig1]',
              startIndex: 0,
              endIndex: 0
            },
            layout: 'single' as const,
            parties: [{ role: 'PARTY A' }],
            notaryRequired: false
          },
          height: 150,
          breakable: false
        },
        {
          type: 'signature',
          content: {
            marker: {
              type: 'signature' as const,
              id: 'sig2',
              fullMarker: '[SIGNATURE_BLOCK:sig2]',
              startIndex: 0,
              endIndex: 0
            },
            layout: 'single' as const,
            parties: [{ role: 'PARTY B' }],
            notaryRequired: false
          },
          height: 150,
          breakable: false
        }
      ];

      const result = layoutEngine.layoutDocument(blocks, 'patent-assignment-agreement');

      // Both signatures should be on page 2 together
      expect(result.pages).toHaveLength(2);
      expect(result.pages[1].blocks).toHaveLength(2);
      expect(result.pages[1].blocks[0].type).toBe('signature');
      expect(result.pages[1].blocks[1].type).toBe('signature');
    });
  });

  describe('side-by-side layouts', () => {
    beforeEach(() => {
      // Set up default analyzeLayout mock for side-by-side tests
      mockParser.analyzeLayout = jest.fn().mockReturnValue({
        columns: 2,
        columnWidth: 209,
        spacing: 50,
        alignment: 'left'
      });
    });

    it('should prepare side-by-side layout blocks', () => {
      const leftContent = ['Left Line 1', 'Left Line 2', 'Left Line 3'];
      const rightContent = ['Right Line 1', 'Right Line 2'];
      
      const blocks = layoutEngine.prepareSideBySideLayout(leftContent, rightContent);
      
      expect(blocks).toHaveLength(3); // Max of left/right content
      expect(blocks[0].content).toBe('Left Line 1\tRight Line 1');
      expect(blocks[1].content).toBe('Left Line 2\tRight Line 2');
      expect(blocks[2].content).toBe('Left Line 3\t'); // Right side empty
      expect(blocks[0].keepWithNext).toBe(true);
      expect(blocks[1].keepWithNext).toBe(true);
      expect(blocks[2].keepWithNext).toBe(false); // Last block
    });

    it('should calculate side-by-side height correctly', () => {
      const leftContent = ['Line 1', 'Line 2'];
      const rightContent = ['Line 1', 'Line 2', 'Line 3', 'Line 4'];
      
      const height = layoutEngine.calculateSideBySideHeight(leftContent, rightContent);
      
      expect(height).toBe(60); // 4 lines * 15 height
    });

    it('should calculate custom line height', () => {
      const leftContent = ['Line 1'];
      const rightContent = ['Line 1', 'Line 2'];
      
      const height = layoutEngine.calculateSideBySideHeight(leftContent, rightContent, 20);
      
      expect(height).toBe(40); // 2 lines * 20 height
    });

    it('should render side-by-side content', () => {
      const startY = 100;
      const columnWidth = 200;
      const spacing = 50;
      
      const endY = layoutEngine.renderSideBySideContent(
        'Left Text',
        'Right Text',
        startY,
        columnWidth,
        spacing
      );
      
      expect(endY).toBe(115); // startY + 15
      
      // Check left content was rendered
      expect(mockGenerator.moveTo).toHaveBeenCalledWith({ x: 72, y: 100 });
      expect(mockGenerator.writeText).toHaveBeenCalledWith('Left Text', {
        fontSize: 12,
        align: 'left'
      });
      
      // Check right content was rendered at correct position
      expect(mockGenerator.moveTo).toHaveBeenCalledWith({ x: 322, y: 100 }); // 72 + 200 + 50
      expect(mockGenerator.writeText).toHaveBeenCalledWith('Right Text', {
        fontSize: 12,
        align: 'left'
      });
    });

    it('should handle empty content in side-by-side render', () => {
      const endY = layoutEngine.renderSideBySideContent(
        '',
        'Only Right',
        100,
        200,
        50
      );
      
      expect(endY).toBe(115);
      expect(mockGenerator.writeText).toHaveBeenCalledTimes(1); // Only right content
      expect(mockGenerator.writeText).toHaveBeenCalledWith('Only Right', expect.any(Object));
    });

    it('should create side-by-side signature blocks', () => {
      const signatureData: SignatureBlockData = {
        marker: {
          type: 'signature' as const,
          id: 'test',
          fullMarker: '[SIGNATURE_BLOCK:test]',
          startIndex: 0,
          endIndex: 0
        },
        layout: 'side-by-side' as const,
        parties: [
          { role: 'ASSIGNOR', name: 'John Doe', title: 'President' },
          { role: 'ASSIGNEE', name: 'Jane Smith', title: 'CEO' }
        ],
        notaryRequired: false
      };

      const blocks = layoutEngine.createSideBySideSignatureBlocks(signatureData);
      
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('signature');
      expect(blocks[0].content).toBe(signatureData);
      expect(blocks[0].height).toBe(90); // Role + sig + name + title + spacing
      expect(blocks[0].breakable).toBe(false);
    });

    it('should add notary block when required for side-by-side', () => {
      const signatureData: SignatureBlockData = {
        marker: {
          type: 'signature' as const,
          id: 'test',
          fullMarker: '[SIGNATURE_BLOCK:test]',
          startIndex: 0,
          endIndex: 0
        },
        layout: 'side-by-side' as const,
        parties: [
          { role: 'PARTY A' },
          { role: 'PARTY B' }
        ],
        notaryRequired: true
      };

      const blocks = layoutEngine.createSideBySideSignatureBlocks(signatureData);
      
      expect(blocks).toHaveLength(2);
      expect(blocks[0].keepWithNext).toBe(true); // Keep with notary
      expect(blocks[1].type).toBe('signature');
      expect((blocks[1].content as any).isNotarySection).toBe(true);
      expect(blocks[1].height).toBe(120); // Standard notary height
    });

    it('should fall back to single column when not suitable for side-by-side', () => {
      const signatureData: SignatureBlockData = {
        marker: {
          type: 'signature' as const,
          id: 'test',
          fullMarker: '[SIGNATURE_BLOCK:test]',
          startIndex: 0,
          endIndex: 0
        },
        layout: 'side-by-side' as const,
        parties: [{ role: 'ONLY ONE PARTY' }], // Only one party
        notaryRequired: false
      };

      const blocks = layoutEngine.createSideBySideSignatureBlocks(signatureData);
      
      expect(blocks).toHaveLength(1);
      expect(blocks[0].height).toBe(60); // Single party height calculation
    });

    it('should create single column signature blocks', () => {
      const signatureData: SignatureBlockData = {
        marker: {
          type: 'signature' as const,
          id: 'test',
          fullMarker: '[SIGNATURE_BLOCK:test]',
          startIndex: 0,
          endIndex: 0
        },
        layout: 'single' as const,
        parties: [
          { role: 'PARTY A', name: 'Alice', title: 'Director' },
          { role: 'PARTY B', name: 'Bob' }
        ],
        notaryRequired: false
      };

      // Override for single column test
      mockParser.analyzeLayout.mockReturnValue({
        columns: 1,
        columnWidth: 468,
        spacing: 0,
        alignment: 'left'
      });

      // Access private method through side-by-side method with single column data
      const blocks = layoutEngine.createSideBySideSignatureBlocks(signatureData);
      
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('signature');
      expect(blocks[0].height).toBe(165); // 2 parties with different fields
    });

    it('should split content into columns', () => {
      const content = ['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5'];
      
      const { left, right } = layoutEngine.splitContentForColumns(content);
      
      expect(left).toEqual(['Line 1', 'Line 2', 'Line 3']);
      expect(right).toEqual(['Line 4', 'Line 5']);
    });

    it('should handle odd number of lines when splitting', () => {
      const content = ['Only one line'];
      
      const { left, right } = layoutEngine.splitContentForColumns(content);
      
      expect(left).toEqual(['Only one line']);
      expect(right).toEqual([]);
    });

    it('should calculate correct height for signatures with minimal fields', () => {
      const signatureData: SignatureBlockData = {
        marker: {
          type: 'signature' as const,
          id: 'test',
          fullMarker: '[SIGNATURE_BLOCK:test]',
          startIndex: 0,
          endIndex: 0
        },
        layout: 'side-by-side' as const,
        parties: [
          { role: 'PARTY A' }, // No name or title
          { role: 'PARTY B', name: 'Bob' } // Only name
        ],
        notaryRequired: false
      };

      const blocks = layoutEngine.createSideBySideSignatureBlocks(signatureData);
      
      expect(blocks[0].height).toBe(75); // Role + sig + name (one party has it) + spacing
    });
  });
}); 