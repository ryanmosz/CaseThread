import { ipcMain, dialog } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

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
  ipcMain.handle(IPC_CHANNELS.GENERATE_DOCUMENT, async (_, { templateId, formData }: { templateId: string; formData: any }) => {
    try {
      // Create temporary YAML file with form data
      const tempYamlPath = path.join(process.cwd(), 'temp', `input-${Date.now()}.yaml`);
      const yamlContent = createYamlFromFormData(formData);
      
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(tempYamlPath), { recursive: true });
      await fs.writeFile(tempYamlPath, yamlContent, 'utf-8');

      // Execute CLI command
      const command = `npm run cli -- generate ${templateId} "${tempYamlPath}"`;
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 60000, // 60 second timeout
      });

      // Clean up temporary file
      await fs.unlink(tempYamlPath).catch(() => {}); // Ignore cleanup errors

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
}

// Security: Validate file paths to prevent directory traversal
function isPathSafe(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const projectRoot = process.cwd();
  return resolvedPath.startsWith(projectRoot);
}

// Convert form data to YAML format for CLI
function createYamlFromFormData(formData: any): string {
  const yamlLines = ['# Generated from GUI form data', ''];
  
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