import { app, BrowserWindow, Menu, shell } from 'electron';
import * as path from 'path';
import { setupIpcHandlers } from './ipc-handlers.js';
import { createApplicationMenu } from './menu.js';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.setupApp();
  }

  private setupApp(): void {
    // This method will be called when Electron has finished initialization
    app.whenReady().then(async () => {
      // Setup IPC handlers FIRST, before creating the window
      setupIpcHandlers();
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
      await this.mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
      
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