'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const APP_PATHS = new Set(['home', 'appData', 'userData', 'documents', 'downloads', 'desktop']);
const RESIZE_DIRECTIONS = new Set([
  'top', 'bottom', 'left', 'right',
  'top-left', 'top-right', 'bottom-left', 'bottom-right',
]);

function listen(channel, callback) {
  if (typeof callback !== 'function') return () => {};
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

function validFilePath(filePath) {
  return typeof filePath === 'string' && filePath.trim().length > 0;
}

contextBridge.exposeInMainWorld('ascend', Object.freeze({
  isElectron: true,
  platform: process.platform,

  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: (name) => APP_PATHS.has(name)
    ? ipcRenderer.invoke('get-app-path', name)
    : Promise.reject(new Error('Invalid app path')),

  openFile: () => ipcRenderer.invoke('dialog-open-file'),
  saveFile: (options = {}) => ipcRenderer.invoke(
    'dialog-save-file',
    options && typeof options === 'object' ? options : {},
  ),
  selectFolder: () => ipcRenderer.invoke('dialog-select-folder'),
  readFile: (filePath) => validFilePath(filePath)
    ? ipcRenderer.invoke('file-read', filePath)
    : Promise.reject(new Error('Invalid file path')),
  writeFile: (filePath, data) => {
    if (!validFilePath(filePath)) return Promise.reject(new Error('Invalid file path'));
    if (typeof data !== 'string') return Promise.reject(new Error('File data must be a string'));
    return ipcRenderer.invoke('file-write', { filePath, data });
  },

  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  getWindowBounds: () => ipcRenderer.invoke('window-get-bounds'),
  setWindowBounds: (bounds) => {
    if (!bounds || typeof bounds !== 'object') return;
    ipcRenderer.send('window-set-bounds', bounds);
  },
  startWindowResize: (direction) => RESIZE_DIRECTIONS.has(direction)
    ? ipcRenderer.invoke('window-start-resize', direction)
    : Promise.reject(new Error('Invalid resize direction')),
  toggleFullscreen: () => ipcRenderer.invoke('window-toggle-fullscreen'),
  exitFullscreen: () => ipcRenderer.invoke('window-exit-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('window-is-fullscreen'),
  onWindowMaximizedChange: (callback) => listen('window-maximized', callback),
  onWindowFullscreenChange: (callback) => listen('window-fullscreen', callback),

  checkForUpdates: () => ipcRenderer.invoke('updater-check-for-updates'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('updater-quit-and-install'),
  onUpdaterEvent: (callback) => listen('updater-event', callback),
}));
