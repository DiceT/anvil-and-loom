import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let vaultPath: string | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : `file://${path.join(__dirname, '../renderer/index.html')}`);
  mainWindow.on('closed', () => (mainWindow = null));
}

// IPC handlers for file system
ipcMain.handle('select-vault', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (!result.canceled && result.filePaths.length > 0) {
    vaultPath = result.filePaths[0];
    return vaultPath;
  }
  return null;
});

ipcMain.handle('read-file', async (_, filePath: string) => {
  if (!vaultPath) return null;
  const fullPath = path.join(vaultPath, filePath);
  if (fs.existsSync(fullPath)) {
    return fs.readFileSync(fullPath, 'utf-8');
  }
  return null;
});

ipcMain.handle('write-file', async (_, filePath: string, content: string) => {
  if (!vaultPath) return;
  const fullPath = path.join(vaultPath, filePath);
  fs.writeFileSync(fullPath, content, 'utf-8');
});

ipcMain.handle('list-files', async () => {
  if (!vaultPath) return [];
  return fs.readdirSync(vaultPath).filter((f) => f.endsWith('.md'));
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});