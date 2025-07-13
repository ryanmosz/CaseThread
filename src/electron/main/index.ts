import { app, BrowserWindow, Menu, shell } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { setupIpcHandlers } from './ipc-handlers.js';
import { createApplicationMenu } from './menu.js';
import { PDFGenerationHandler } from './ipc/pdf-generation-handler.js';
import { ProgressHandlers } from './ipc/progress-handlers.js';
import { ProgressManager } from './ipc/progress-manager.js';
import { PDFExportHandler } from './ipc/pdf-export-handler.js';
import { SecureIPCHandler } from './ipc/secure-handler.js';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';

// Load environment variables from .env file
try {
  dotenv.config();
  console.log('Environment variables loaded successfully');
  console.log('OPENAI_API_KEY configured:', process.env.OPENAI_API_KEY ? 'Yes' : 'No');
  console.log('OPENAI_CHAT_MODEL:', process.env.OPENAI_CHAT_MODEL || 'Not set (will use default)');
} catch (error) {
  console.warn('Failed to load .env file:', error);
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.setupApp();
  }

  /**
   * Install React DevTools extension for development
   */
  private async installDevTools(): Promise<void> {
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      try {
        const name = await installExtension(REACT_DEVELOPER_TOOLS);
        console.log(`✅ Added Extension: ${name}`);
      } catch (err) {
        console.error('❌ Failed to install React DevTools:', err);
      }
    }
  }

  private setupApp(): void {
    // Enable remote debugging for automated testing
    if (process.env.CASETHREAD_AUTO_GENERATE === 'true') {
      app.commandLine.appendSwitch('remote-debugging-port', '9222');
      console.log('Remote debugging enabled on port 9222 for automated testing');
    }
    
    // This method will be called when Electron has finished initialization
    app.whenReady().then(async () => {
      // Install React DevTools in development mode
      await this.installDevTools();
      
      // Setup IPC handlers FIRST, before creating the window
      setupIpcHandlers();
      
      // Initialize PDF generation handler
      PDFGenerationHandler.getInstance();
      console.log('PDF generation handler initialized');
      
      // Initialize progress handlers
      ProgressHandlers.getInstance();
      console.log('Progress handlers initialized');
      
      // Initialize PDF export handler
      PDFExportHandler.getInstance();
      console.log('PDF export handler initialized');
      
      await this.createMainWindow();
      this.setupMenu();

      // On macOS, re-create a window when dock icon is clicked
      app.on('activate', async () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          await this.createMainWindow();
        }
      });
    });

    // Quit when all windows are closed, except on macOS
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (_, contents) => {
      contents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
      });
    });

    // Cleanup on app quit
    app.on('before-quit', () => {
      console.log('Cleaning up PDF generation handler...');
      PDFGenerationHandler.getInstance().cleanup();
      
      console.log('Cleaning up progress manager...');
      ProgressManager.getInstance().cleanup();
      
      console.log('Cleaning up secure IPC handler...');
      SecureIPCHandler.cleanup();
    });
  }

  private async createMainWindow(): Promise<void> {
    // Create the browser window
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      show: false,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      webPreferences: {
        // Security settings
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
        // Preload script
        preload: path.join(__dirname, '../preload/index.js'),
      },
    });

    // Load the renderer
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      // Check for auto-generation parameters
      const autoGenerate = process.env.CASETHREAD_AUTO_GENERATE === 'true';
      const documentType = process.env.CASETHREAD_DOCUMENT_TYPE || '';
      
      let loadUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL;
      
      if (autoGenerate && documentType) {
        const params = new URLSearchParams({
          autoGenerate: 'true',
          documentType: documentType
        });
        loadUrl = `${MAIN_WINDOW_VITE_DEV_SERVER_URL}?${params.toString()}`;
        console.log('Loading with auto-generation:', loadUrl);
        console.log('Auto-generate parameters:', { autoGenerate, documentType });
      }
      
      await this.mainWindow.loadURL(loadUrl);
      
      // Log when page loads successfully
      this.mainWindow.webContents.once('did-finish-load', () => {
        console.log('Renderer page loaded successfully');
        if (autoGenerate) {
          console.log('Auto-generation should trigger in renderer process');
        }
      });
      
      // Set CSP header to allow Google Fonts
      this.mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [
              "default-src 'self'; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "font-src 'self' https://fonts.gstatic.com; " +
              "img-src 'self' data: https:; " +
              "script-src 'self' 'unsafe-eval' 'unsafe-inline';"
            ]
          }
        });
      });
      
      // Open DevTools in development
      this.mainWindow.webContents.openDevTools();
    } else {
      await this.mainWindow.loadFile(
        path.join(__dirname, '../renderer/index.html')
      );
    }

    // Show window immediately after load to debug any issues
    this.mainWindow.show();
    this.mainWindow.focus();
    
    // Force window to be visible and on top
    this.mainWindow.setVisibleOnAllWorkspaces(true);
    this.mainWindow.setAlwaysOnTop(true);
    
    // After a short delay, remove always-on-top so it behaves normally
    setTimeout(() => {
      this.mainWindow?.setAlwaysOnTop(false);
      this.mainWindow?.setVisibleOnAllWorkspaces(false);
    }, 3000);

    // Also show when ready-to-show fires (backup)
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      this.mainWindow?.focus();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Security: Prevent navigation to external URLs
    this.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      if (MAIN_WINDOW_VITE_DEV_SERVER_URL && parsedUrl.origin !== new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL).origin) {
        event.preventDefault();
      }
    });

    // Add error handling for renderer crashes
    this.mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('Renderer process crashed:', details);
    });

    this.mainWindow.webContents.on('unresponsive', () => {
      console.error('Renderer process became unresponsive');
    });
  }

  private setupMenu(): void {
    const menu = createApplicationMenu();
    Menu.setApplicationMenu(menu);
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}

/// <reference path="./vite-env.d.ts" />

// Initialize the application
new WindowManager(); 