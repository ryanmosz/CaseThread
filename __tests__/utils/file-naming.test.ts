import { 
  generateOutputFilename, 
  createOutputPath, 
  parseOutputFilename
} from '../../src/utils/file-naming';

describe('File Naming Utilities', () => {
  beforeEach(() => {
    // Mock the current date/time for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T14:30:52'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('generateOutputFilename', () => {
    it('should generate correct filename format', () => {
      const filename = generateOutputFilename('patent-assignment');
      expect(filename).toBe('patent-assignment-2024-01-15-14-30-52.md');
    });

    it('should handle different document types', () => {
      expect(generateOutputFilename('nda-ip-specific')).toBe('nda-ip-specific-2024-01-15-14-30-52.md');
      expect(generateOutputFilename('trademark-application')).toBe('trademark-application-2024-01-15-14-30-52.md');
    });

    it('should pad single digits correctly', () => {
      jest.setSystemTime(new Date('2024-03-05T09:05:08'));
      const filename = generateOutputFilename('test-doc');
      expect(filename).toBe('test-doc-2024-03-05-09-05-08.md');
    });
  });

  describe('createOutputPath', () => {
    it('should combine directory and filename correctly', () => {
      const outputPath = createOutputPath('/output/dir', 'patent-assignment');
      expect(outputPath).toBe('/output/dir/patent-assignment-2024-01-15-14-30-52.md');
    });

    it('should handle relative paths', () => {
      const outputPath = createOutputPath('./output', 'test-doc');
      expect(outputPath).toBe('output/test-doc-2024-01-15-14-30-52.md');
    });

    it('should handle current directory', () => {
      const outputPath = createOutputPath('.', 'test-doc');
      expect(outputPath).toBe('test-doc-2024-01-15-14-30-52.md');
    });
  });

  describe('parseOutputFilename', () => {
    it('should parse valid filename', () => {
      const result = parseOutputFilename('patent-assignment-2024-01-15-143052.md');
      expect(result).toEqual({
        documentType: 'patent-assignment',
        timestamp: '2024-01-15-143052'
      });
    });

    it('should handle hyphenated document types', () => {
      const result = parseOutputFilename('nda-ip-specific-2024-01-15-143052.md');
      expect(result).toEqual({
        documentType: 'nda-ip-specific',
        timestamp: '2024-01-15-143052'
      });
    });

    it('should return null for invalid filenames', () => {
      expect(parseOutputFilename('invalid.md')).toBeNull();
      expect(parseOutputFilename('test-doc.txt')).toBeNull();
      expect(parseOutputFilename('no-timestamp.md')).toBeNull();
    });
  });
}); 