import * as path from 'path';

/**
 * Generates a timestamp string in format YYYY-MM-DD-HHMMSS
 */
export function generateTimestamp(): string {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}

/**
 * Generates a folder name for document generation
 * Format: [YYYY-MM-DD-HHMMSS]-[document-type]
 * Example: 2024-01-15-143052-patent-assignment
 */
export function generateDocumentFolderName(documentType: string): string {
  const timestamp = generateTimestamp();
  return `${timestamp}-${documentType}`;
}

/**
 * Generates a timestamp-based filename for the output document
 * Format: [document-type]-[YYYY-MM-DD-HHMMSS].md
 * Example: patent-assignment-2024-01-15-143052.md
 */
export function generateOutputFilename(documentType: string): string {
  const timestamp = generateTimestamp();
  return `${documentType}-${timestamp}.md`;
}

/**
 * Creates organized folder structure for document generation
 * Returns: { folderPath, documentPath, formDataPath }
 */
export function createDocumentPaths(outputDir: string, documentType: string): {
  folderName: string;
  folderPath: string;
  documentPath: string;
  formDataPath: string;
} {
  const folderName = generateDocumentFolderName(documentType);
  const folderPath = path.join(outputDir, folderName);
  const documentPath = path.join(folderPath, 'document.md');
  const formDataPath = path.join(folderPath, 'form-data.yaml');
  
  return {
    folderName,
    folderPath,
    documentPath,
    formDataPath
  };
}

/**
 * Creates the full output path by combining directory and filename (legacy function)
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