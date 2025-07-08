import * as path from 'path';

/**
 * Generates a timestamp-based filename for the output document
 * Format: [document-type]-[YYYY-MM-DD-HHMMSS].md
 * Example: patent-assignment-2024-01-15-143052.md
 */
export function generateOutputFilename(documentType: string): string {
  const now = new Date();
  
  // Format: YYYY-MM-DD-HHMMSS
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const timestamp = `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
  
  return `${documentType}-${timestamp}.md`;
}

/**
 * Creates the full output path by combining directory and filename
 */
export function createOutputPath(outputDir: string, documentType: string): string {
  const filename = generateOutputFilename(documentType);
  return path.join(outputDir, filename);
}

/**
 * Extracts metadata from the filename for logging/display
 */
export function parseOutputFilename(filename: string): {
  documentType: string;
  timestamp: string;
} | null {
  const match = filename.match(/^(.+)-(\d{4}-\d{2}-\d{2}-\d{6})\.md$/);
  if (!match) {
    return null;
  }
  
  return {
    documentType: match[1],
    timestamp: match[2]
  };
} 