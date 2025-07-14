import * as path from 'path';

/**
 * Generates a timestamp string in format YYYY-MM-DD HH:MM:SS
 */
export function generateTimestamp(): string {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Maps template types to organized folder categories
 */
const TEMPLATE_TYPE_TO_FOLDER: Record<string, string> = {
  'letter': 'Letters',
  'application': 'Applications',
  'response': 'Responses',
  'agreement': 'Agreements',
  'motion': 'Motions',
  'brief': 'Briefs',
  'memo': 'Memos',
  'notice': 'Notices',
  'petition': 'Petitions',
  'contract': 'Contracts',
  'default': 'Documents'
};

/**
 * Gets the appropriate folder name for a template type
 */
export function getFolderForTemplateType(templateType: string): string {
  return TEMPLATE_TYPE_TO_FOLDER[templateType] || TEMPLATE_TYPE_TO_FOLDER['default'];
}

/**
 * Generates a readable document folder name
 * Format: [Document Name] - [YYYY-MM-DD HH:MM:SS]
 * Example: Cease and Desist Letter (IP Infringement) - 2024-01-15 14:30:52
 */
export function generateDocumentFolderName(templateName: string): string {
  const timestamp = generateTimestamp();
  return `${templateName} - ${timestamp}`;
}

/**
 * Generates a timestamp-based filename for the output document (legacy)
 * Format: [document-type]-[YYYY-MM-DD-HHMMSS].md
 * Example: patent-assignment-2024-01-15-143052.md
 */
export function generateOutputFilename(documentType: string): string {
  const timestamp = generateTimestamp().replace(/[: ]/g, '-');
  return `${documentType}-${timestamp}.md`;
}

/**
 * Creates organized folder structure for document generation
 * Returns: { categoryFolder, folderName, folderPath, documentPath, formDataPath }
 */
export function createDocumentPaths(
  outputDir: string, 
  templateId: string, 
  templateMetadata?: {
    name?: string;
    type?: string;
  }
): {
  categoryFolder: string;
  folderName: string;
  folderPath: string;
  documentPath: string;
  formDataPath: string;
} {
  // Use template metadata if provided, otherwise fall back to ID
  const templateName = templateMetadata?.name || templateId;
  const templateType = templateMetadata?.type || 'default';
  
  // Get the category folder (Letters, Agreements, etc.)
  const categoryFolder = getFolderForTemplateType(templateType);
  
  // Generate the document folder name
  const folderName = generateDocumentFolderName(templateName);
  
  // Create the full path structure
  const categoryPath = path.join(outputDir, categoryFolder);
  const folderPath = path.join(categoryPath, folderName);
  const documentPath = path.join(folderPath, 'document.md');
  const formDataPath = path.join(folderPath, 'form-data.yaml');
  
  return {
    categoryFolder,
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