'use strict';

const { app, BrowserWindow, dialog, globalShortcut, ipcMain } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const WindowManager = require('./window-manager');

app.setName('ASCEND Journal');

// A OneDrive-hosted source directory can cause Chromium's development disk-cache
// relocation to fail on Windows. Keep only development session/cache files in the
// writable system temp area; packaged releases retain Electron's normal profile path.
const isDevelopment = !app.isPackaged;
if (isDevelopment) {
  app.setPath('sessionData', path.join(app.getPath('temp'), 'ascend-journal-dev-session'));
}

const windowManager = new WindowManager();
const authorizedReadPaths = new Set();
const authorizedWritePaths = new Set();
let updateCheckInProgress = false;
let updateReadyToInstall = false;

function activeWindow() {
  return windowManager.get();
}

function sendToRenderer(channel, payload) {
  const win = activeWindow();
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function updaterEvent(status, extra = {}) {
  sendToRenderer('updater-event', { status, ...extra });
}

function allowPath(set, filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) return null;
  const resolved = path.resolve(filePath);
  set.add(resolved);
  return resolved;
}

function consumeAuthorizedPath(set, filePath) {
  const resolved = typeof filePath === 'string' ? path.resolve(filePath) : '';
  if (!resolved || !set.has(resolved)) throw new Error('This file was not selected through ASCEND.');
  set.delete(resolved);
  return resolved;
}

function isJsonBackupPath(filePath) {
  return path.extname(filePath).toLowerCase() === '.json';
}

async function checkForUpdates() {
  if (isDevelopment) {
    updaterEvent('error', { message: 'Update checks are available only in an installed desktop release.' });
    return { ok: false, reason: 'development-build' };
  }
  if (updateCheckInProgress) return { ok: false, reason: 'already-checking' };

  updateCheckInProgress = true;
  try {
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (error) {
    updateCheckInProgress = false;
    const message = error && error.message ? error.message : 'Could not check for updates.';
    console.error('ASCEND updater check failed:', error);
    updaterEvent('error', { message });
    return { ok: false, reason: 'check-failed' };
  }
}

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = activeWindow();
    if (!win) return;
    if (win.isMinimized()) win.restore();
    if (!win.isVisible()) win.show();
    win.focus();
  });
}

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('window-minimize', () => windowManager.minimize());
ipcMain.handle('window-maximize', () => windowManager.toggleMaximize());
ipcMain.handle('window-close', () => windowManager.close());
ipcMain.handle('window-is-maximized', () => windowManager.isMaximized());
ipcMain.handle('window-get-bounds', () => windowManager.getBounds());
ipcMain.handle('window-start-resize', () => windowManager.startResize());
ipcMain.handle('window-toggle-fullscreen', () => windowManager.toggleFullscreen());
ipcMain.handle('window-exit-fullscreen', () => windowManager.exitFullscreen());
ipcMain.handle('window-is-fullscreen', () => windowManager.isFullscreen());
ipcMain.on('window-set-bounds', (_event, bounds) => windowManager.setBounds(bounds));

ipcMain.handle('get-app-path', (_event, name) => {
  const allowed = new Set(['home', 'appData', 'userData', 'documents', 'downloads', 'desktop']);
  if (!allowed.has(name)) throw new Error('Invalid app path');
  return app.getPath(name);
});

ipcMain.handle('dialog-open-file', async () => {
  const win = activeWindow();
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    title: 'Open ASCEND Backup',
    properties: ['openFile'],
    filters: [{ name: 'ASCEND Backup', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return allowPath(authorizedReadPaths, result.filePaths[0]);
});

ipcMain.handle('dialog-save-file', async (_event, options = {}) => {
  const win = activeWindow();
  if (!win) return null;
  const result = await dialog.showSaveDialog(win, {
    title: typeof options.title === 'string' ? options.title.slice(0, 120) : 'Save ASCEND Backup',
    defaultPath: typeof options.defaultPath === 'string' ? options.defaultPath.slice(0, 240) : 'ASCEND-Backup.json',
    filters: [{ name: 'ASCEND Backup', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return null;
  return allowPath(authorizedWritePaths, result.filePath);
});

ipcMain.handle('dialog-select-folder', async () => {
  const win = activeWindow();
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    title: 'Select ASCEND Backup Folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.canceled ? null : (result.filePaths[0] || null);
});

ipcMain.handle('file-read', async (_event, filePath) => {
  const selectedPath = consumeAuthorizedPath(authorizedReadPaths, filePath);
  if (!isJsonBackupPath(selectedPath)) throw new Error('ASCEND backups must be JSON files.');
  const stat = await fs.stat(selectedPath);
  if (stat.size > 50 * 1024 * 1024) throw new Error('The selected backup is larger than 50 MB.');
  return fs.readFile(selectedPath, 'utf8');
});

ipcMain.handle('file-write', async (_event, payload) => {
  if (!payload || typeof payload !== 'object' || typeof payload.data !== 'string') {
    throw new Error('Invalid ASCEND backup payload.');
  }
  if (Buffer.byteLength(payload.data, 'utf8') > 50 * 1024 * 1024) {
    throw new Error('ASCEND backups must be 50 MB or smaller.');
  }
  const selectedPath = consumeAuthorizedPath(authorizedWritePaths, payload.filePath);
  if (!isJsonBackupPath(selectedPath)) throw new Error('ASCEND backups must use a JSON filename.');
  await fs.writeFile(selectedPath, payload.data, { encoding: 'utf8', mode: 0o600 });
  return true;
});

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.on('checking-for-update', () => updaterEvent('checking'));
autoUpdater.on('update-available', (info) => updaterEvent('update-available', { info }));
autoUpdater.on('update-not-available', (info) => {
  updateCheckInProgress = false;
  updaterEvent('update-not-available', { info });
});
autoUpdater.on('download-progress', (progress) => updaterEvent('download-progress', { progress }));
autoUpdater.on('update-downloaded', (info) => {
  updateCheckInProgress = false;
  updateReadyToInstall = true;
  updaterEvent('update-downloaded', { info });
});
autoUpdater.on('error', (error) => {
  updateCheckInProgress = false;
  const message = error && error.message ? error.message : 'Unknown updater error';
  console.error('ASCEND updater error:', error);
  updaterEvent('error', { message });
});

ipcMain.handle('updater-check-for-updates', checkForUpdates);
ipcMain.handle('updater-quit-and-install', () => {
  if (!updateReadyToInstall) return false;
  autoUpdater.quitAndInstall();
  return true;
});

app.whenReady().then(() => {
  windowManager.create();
  globalShortcut.register('F11', () => windowManager.toggleFullscreen());
  if (app.isPackaged) setTimeout(() => { checkForUpdates(); }, 5000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) windowManager.create();
  });
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
