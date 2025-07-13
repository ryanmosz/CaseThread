import { ipcMain, dialog } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createDocumentPaths } from '../../utils/file-naming';

const execAsync = promisify(exec);

// IPC Channel constants
export const IPC_CHANNELS = {
  // File system operations
  READ_FILE: 'fs:readFile',
  WRITE_FILE: 'fs:writeFile',
  READ_DIRECTORY: 'fs:readDirectory',
  
  // Template operations
  LOAD_TEMPLATES: 'template:loadTemplates',
  LOAD_TEMPLATE_SCHEMA: 'template:loadSchema',
  
  // CLI operations
  GENERATE_DOCUMENT: 'cli:generateDocument',
  LEARN_FROM_PATH: 'cli:learnFromPath',
  
  // Dialog operations
  SHOW_SAVE_DIALOG: 'dialog:showSaveDialog',
  SHOW_OPEN_DIALOG: 'dialog:showOpenDialog',
  
  // AI Assistant operations
  CALL_AI_ASSISTANT: 'ai:callAssistant',
} as const;

// Recursively build directory tree structure
async function buildDirectoryTree(dirPath: string): Promise<any[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const result: any[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const item: any = {
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: fullPath,
    };

    if (entry.isDirectory()) {
      try {
        // Recursively build children for directories
        const children = await buildDirectoryTree(fullPath);
        item.children = children;
      } catch (error) {
        // If we can't read the directory, just leave it without children
        console.warn(`Could not read directory ${fullPath}:`, error);
        item.children = [];
      }
    }

    result.push(item);
  }

  return result.sort((a: any, b: any) => {
    // Sort directories first, then files
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function setupIpcHandlers(): void {
  // File system handlers
  ipcMain.handle(IPC_CHANNELS.READ_FILE, async (_, filePath: string) => {
    try {
      if (!isPathSafe(filePath)) {
        throw new Error('Invalid file path');
      }
      const content = await fs.readFile(filePath, 'utf-8');
      return { success: true, data: content };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.WRITE_FILE, async (_, { filePath, content }: { filePath: string; content: string }) => {
    try {
      if (!isPathSafe(filePath)) {
        throw new Error('Invalid file path');
      }
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.READ_DIRECTORY, async (_, dirPath: string) => {
    try {
      if (!isPathSafe(dirPath)) {
        throw new Error('Invalid directory path');
      }
      const result = await buildDirectoryTree(dirPath);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Template handlers
  ipcMain.handle(IPC_CHANNELS.LOAD_TEMPLATES, async () => {
    try {
      const templatesDir = path.join(process.cwd(), 'templates', 'core');
      const files = await fs.readdir(templatesDir);
      const templates = [];

      for (const file of files) {
        if (path.extname(file) === '.json') {
          const filePath = path.join(templatesDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const template = JSON.parse(content);
          templates.push({
            id: path.basename(file, '.json'),
            ...template,
            filePath,
          });
        }
      }

      return { success: true, data: templates };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LOAD_TEMPLATE_SCHEMA, async (_, templateId: string) => {
    try {
      const templatePath = path.join(process.cwd(), 'templates', 'core', `${templateId}.json`);
      const content = await fs.readFile(templatePath, 'utf-8');
      const template = JSON.parse(content);
      return { success: true, data: template };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // CLI operation handlers
  ipcMain.handle(IPC_CHANNELS.GENERATE_DOCUMENT, async (_, { templateId, formData, options }: { templateId: string; formData: any; options?: { useMultiagent?: boolean } }) => {
    try {
      console.log('IPC: Generate document called with:', { templateId, formData });
      
      // Validate inputs
      if (!templateId || typeof templateId !== 'string') {
        throw new Error('Invalid template ID provided');
      }
      
      if (!formData || typeof formData !== 'object') {
        throw new Error('Invalid form data provided');
      }
      
      // Ensure form data is clean and serializable
      const cleanFormData = JSON.parse(JSON.stringify(formData));
      
      // Load template metadata for better organization
      const templatePath = path.join(process.cwd(), 'templates', 'core', `${templateId}.json`);
      let templateMetadata: { name?: string; type?: string } = {};
      
      try {
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const template = JSON.parse(templateContent);
        templateMetadata = {
          name: template.name,
          type: template.type
        };
      } catch (error) {
        console.warn('IPC: Could not load template metadata:', error);
      }
      
      // Create organized folder structure for this document
      const baseOutputDir = path.join(process.cwd(), 'output');
      const documentPaths = createDocumentPaths(baseOutputDir, templateId, templateMetadata);
      const yamlContent = createYamlFromFormData(cleanFormData, templateId);
      
      console.log('IPC: Creating document folder:', documentPaths.folderName);
      console.log('IPC: Category folder:', documentPaths.categoryFolder);
      console.log('IPC: Generated YAML content:', yamlContent);
      
      // Create the document folder structure (including category folder)
      await fs.mkdir(documentPaths.folderPath, { recursive: true });
      
      // Save form data as YAML in the folder
      await fs.writeFile(documentPaths.formDataPath, yamlContent, 'utf-8');
      console.log('IPC: Form data saved to:', documentPaths.formDataPath);

      // Execute CLI command to generate document in the folder
      const qualityFlag = options?.useMultiagent ? ' --quality' : '';
      const command = `npm run cli -- generate ${templateId} "${documentPaths.formDataPath}" --output "${documentPaths.folderPath}"${qualityFlag}`;
      console.log('IPC: Executing command:', command);
      console.log('IPC: Using multiagent pipeline:', options?.useMultiagent || false);
      
      // Set timeout based on whether quality pipeline is being used
      const timeoutMs = options?.useMultiagent ? 300000 : 60000; // 5 minutes for quality, 1 minute for normal
      console.log('IPC: Using timeout:', timeoutMs / 1000, 'seconds');
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: timeoutMs,
      });

      console.log('IPC: Command completed:', { 
        stdoutLength: stdout.length, 
        stderrLength: stderr.length,
        stdoutPreview: stdout.substring(0, 100) + (stdout.length > 100 ? '...' : ''),
        stderr: stderr 
      });

      // Read the generated document file and move it to organized location
      let documentContent = '';
      let finalDocumentPath = '';
      try {
        const outputFiles = await fs.readdir(documentPaths.folderPath);
        const documentFile = outputFiles.find(file => file.startsWith(templateId) && file.endsWith('.md'));
        
        if (documentFile) {
          const generatedDocPath = path.join(documentPaths.folderPath, documentFile);
          documentContent = await fs.readFile(generatedDocPath, 'utf-8');
          
          // Remove metadata comments for UI-generated documents to keep diff editor clean
          documentContent = removeMetadataComments(documentContent);
          
          // Save the clean document content to the standard "document.md" name
          await fs.writeFile(documentPaths.documentPath, documentContent, 'utf-8');
          
          // Remove the original CLI-generated file since we've created the clean version
          await fs.unlink(generatedDocPath);
          
          finalDocumentPath = documentPaths.documentPath;
          
          console.log('IPC: Document content loaded and cleaned, length:', documentContent.length);
          console.log('IPC: Document organized and saved to:', finalDocumentPath);
        } else {
          console.warn('IPC: No generated document file found in output folder');
        }
      } catch (error) {
        console.error('IPC: Failed to read/organize generated document:', error);
      }

      return { 
        success: true, 
        data: {
          output: documentContent || stdout, // Use document content if available, fallback to stdout
          cliOutput: stdout,
          errors: stderr,
          documentContent: documentContent,
          savedFilePath: finalDocumentPath, // Path to the document file
          folderPath: documentPaths.folderPath, // Path to the folder containing both files
          folderName: documentPaths.folderName, // Name of the generated folder
          categoryFolder: documentPaths.categoryFolder, // Category folder (Letters, Agreements, etc.)
          formDataPath: documentPaths.formDataPath // Path to the form data YAML file
        }
      };
    } catch (error) {
      console.error('IPC: Generate document failed:', error);
      
      // Return a more user-friendly error message
      let errorMessage = 'Document generation failed';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Document generation timed out. Please try again.';
        } else if (error.message.includes('ENOENT')) {
          errorMessage = 'CLI command not found. Please check your installation.';
        } else if (error.message.includes('Permission denied')) {
          errorMessage = 'Permission denied. Please check file permissions.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LEARN_FROM_PATH, async (_, dirPath: string) => {
    try {
      if (!isPathSafe(dirPath)) {
        throw new Error('Invalid directory path');
      }

      const command = `npm run cli -- learn "${dirPath}"`;
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 120000, // 2 minute timeout for learning
      });

      return { 
        success: true, 
        data: {
          output: stdout,
          errors: stderr,
        }
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Dialog handlers
  ipcMain.handle(IPC_CHANNELS.SHOW_SAVE_DIALOG, async (_, options = {}) => {
    const result = await dialog.showSaveDialog({
      defaultPath: 'document.md',
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      ...options,
    });
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.SHOW_OPEN_DIALOG, async (_, options = {}) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      ...options,
    });
    return result;
  });

  // AI Assistant handler
  ipcMain.handle(IPC_CHANNELS.CALL_AI_ASSISTANT, async (_, prompt: string) => {
    try {
      // Import OpenAI directly for chat completion
      const OpenAI = await import('openai');
      
      // Create OpenAI client
      const apiKey = process.env.OPENAI_API_KEY || '';
      
      // Validate API key
      if (!apiKey) {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.');
      }
      
      const openai = new OpenAI.default({
        apiKey: apiKey,
        timeout: 60000
      });
      
             // Create chat completion for AI assistant
       const completion = await openai.chat.completions.create({
         model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a helpful AI assistant integrated into CaseThread, a legal document generation application. You help users with:
- Document editing and improvement suggestions
- Legal writing assistance
- Document structure and formatting
- Content clarification and enhancement
- General questions about legal documents

Please provide helpful, accurate, and professional responses. Keep your responses concise and focused on the user's needs.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.3,
        stream: false
      });
      
      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('No response received from AI assistant');
      }
      
      return { success: true, data: response };
    } catch (error) {
      console.error('AI Assistant error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  });
}

// Security: Validate file paths to prevent directory traversal
function isPathSafe(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const projectRoot = process.cwd();
  return resolvedPath.startsWith(projectRoot);
}

// Convert form data to YAML format for CLI
function createYamlFromFormData(formData: any, templateId: string): string {
  const yamlLines = ['# Generated from GUI form data', ''];
  
  // Add required metadata fields first
  yamlLines.push('# Metadata');
  yamlLines.push('client: "GUI Client"');
  yamlLines.push('attorney: "GUI Attorney"');
  yamlLines.push(`document_type: "${templateId}"`);
  yamlLines.push(`template: "${templateId}.json"`);
  yamlLines.push('');
  
  // Add form data fields
  yamlLines.push('# Document Parameters');
  
  for (const [key, value] of Object.entries(formData)) {
    if (value === null || value === undefined) {
      // Skip null/undefined values
      continue;
    } else if (typeof value === 'string') {
      if (value.trim() === '') {
        // Skip empty strings
        continue;
      }
      // Escape quotes and handle multi-line strings
      const escapedValue = value.replace(/"/g, '\\"');
      if (value.includes('\n')) {
        yamlLines.push(`${key}: |`);
        value.split('\n').forEach(line => yamlLines.push(`  ${line}`));
      } else {
        yamlLines.push(`${key}: "${escapedValue}"`);
      }
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        // Skip empty arrays
        continue;
      }
      yamlLines.push(`${key}:`);
      value.forEach(item => {
        if (typeof item === 'string') {
          yamlLines.push(`  - "${item}"`);
        } else {
          yamlLines.push(`  - ${item}`);
        }
      });
    } else if (typeof value === 'boolean') {
      yamlLines.push(`${key}: ${value}`);
    } else if (typeof value === 'number') {
      yamlLines.push(`${key}: ${value}`);
    } else {
      // Handle objects and other types
      yamlLines.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  
  return yamlLines.join('\n');
} 

// Function to remove metadata comments from a Markdown document
function removeMetadataComments(content: string): string {
  // Remove HTML-style metadata comments at the beginning of the document
  // This regex matches the entire comment block including the <!-- and --> tags
  return content.replace(/^<!--\s*\n(Generated by CaseThread CLI POC[\s\S]*?)\s*-->\s*\n+/, '');
} 