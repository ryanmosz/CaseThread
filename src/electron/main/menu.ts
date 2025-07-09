import { Menu, MenuItemConstructorOptions, app, shell } from 'electron';

export function createApplicationMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [];

  // macOS specific app menu
  if (process.platform === 'darwin') {
    template.push({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  // File menu
  template.push({
    label: 'File',
    submenu: [
      {
        label: 'Generate Document',
        accelerator: 'CmdOrCtrl+N',
        click: () => {
          // TODO: Implement generate document action
        }
      },
      { type: 'separator' },
      process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
    ]
  });

  // Edit menu
  template.push({
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' }
    ]
  });

  // View menu
  template.push({
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  });

  // Window menu
  template.push({
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'close' }
    ]
  });

  // Help menu
  template.push({
    label: 'Help',
    submenu: [
      {
        label: 'About CaseThread',
        click: async () => {
          await shell.openExternal('https://github.com/casethread/casethread');
        }
      },
      {
        label: 'Documentation',
        click: async () => {
          await shell.openExternal('https://github.com/casethread/casethread/docs');
        }
      }
    ]
  });

  return Menu.buildFromTemplate(template);
} 