'use strict';

const { BrowserWindow, screen, shell } = require('electron');
const windowStateKeeper = require('electron-window-state');
const path = require('path');
const { pathToFileURL } = require('url');

const MIN_WIDTH = 1100;
const MIN_HEIGHT = 700;
const DEFAULT_WIDTH = 1440;
const DEFAULT_HEIGHT = 900;

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function rectsIntersect(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function recoveredWindowBounds(savedState) {
  const primary = screen.getPrimaryDisplay().workArea;
  const width = Math.min(primary.width, Math.max(MIN_WIDTH, Math.round(savedState.width || DEFAULT_WIDTH)));
  const height = Math.min(primary.height, Math.max(MIN_HEIGHT, Math.round(savedState.height || DEFAULT_HEIGHT)));
  const candidate = {
    x: finiteNumber(savedState.x) ? Math.round(savedState.x) : primary.x + Math.round((primary.width - width) / 2),
    y: finiteNumber(savedState.y) ? Math.round(savedState.y) : primary.y + Math.round((primary.height - height) / 2),
    width,
    height,
  };
  const visible = screen.getAllDisplays().some(display => rectsIntersect(candidate, display.workArea));
  if (visible) return candidate;
  return {
    x: primary.x + Math.round((primary.width - width) / 2),
    y: primary.y + Math.round((primary.height - height) / 2),
    width,
    height,
  };
}

class WindowManager {
  constructor() {
    this.window = null;
  }

  get() {
    return this.window && !this.window.isDestroyed() ? this.window : null;
  }

  create() {
    const existing = this.get();
    if (existing) {
      existing.show();
      existing.focus();
      return existing;
    }

    const savedState = windowStateKeeper({
      defaultWidth: DEFAULT_WIDTH,
      defaultHeight: DEFAULT_HEIGHT,
    });

    const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
    const initialBounds = recoveredWindowBounds(savedState);
    const win = new BrowserWindow({
      x: initialBounds.x,
      y: initialBounds.y,
      width: initialBounds.width,
      height: initialBounds.height,
      minWidth: MIN_WIDTH,
      minHeight: MIN_HEIGHT,
      icon: path.join(__dirname, '..', 'build', iconFile),
      show: false,
      frame: true,
      titleBarStyle: 'hidden',
      titleBarOverlay: {color:'#000000',symbolColor:'#fafafa',height:42},
      title: 'ASCEND Journal',
      backgroundColor: '#000000',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        spellcheck: false,
      },
    });

    this.window = win;
    savedState.manage(win);

    win.once('ready-to-show', () => {
      if (!win.isDestroyed()) win.show();
    });

    win.on('maximize', () => this.sendWindowState('window-maximized', true));
    win.on('unmaximize', () => this.sendWindowState('window-maximized', false));
    win.on('enter-full-screen', () => this.sendWindowState('window-fullscreen', true));
    win.on('leave-full-screen', () => this.sendWindowState('window-fullscreen', false));
    win.on('closed', () => {
      if (this.window === win) this.window = null;
    });

    win.webContents.setWindowOpenHandler(({ url }) => {
      if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
        shell.openExternal(url).catch(() => {});
      }
      return { action: 'deny' };
    });

    win.webContents.on('will-navigate', (event, url) => {
      const expected=pathToFileURL(path.join(__dirname,'..','index.html'));let target;try{target=new URL(url);}catch{}if(!target||target.protocol!==expected.protocol||target.pathname!==expected.pathname)event.preventDefault();
    });

    win.webContents.on('render-process-gone', (_event, details) => {
      console.error('ASCEND renderer process ended:', details.reason);
    });

    const rendererUrl = pathToFileURL(path.join(__dirname, '..', 'index.html')).toString();
    win.loadURL(rendererUrl).catch((error) => {
      console.error('ASCEND window failed to load:', error);
    });

    return win;
  }

  sendWindowState(channel, value) {
    const win = this.get();
    if (win) win.webContents.send(channel, value);
  }

  minimize() {
    const win = this.get();
    if (win) win.minimize();
  }

  toggleMaximize() {
    const win = this.get();
    if (!win) return false;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return win.isMaximized();
  }

  close() {
    const win = this.get();
    if (win) win.close();
  }

  isMaximized() {
    const win = this.get();
    return Boolean(win && win.isMaximized());
  }

  getBounds() {
    const win = this.get();
    return win ? win.getBounds() : null;
  }

  setBounds(bounds) {
    const win = this.get();
    if (!win || !bounds || typeof bounds !== 'object') return false;

    const current = win.getBounds();
    const display = screen.getDisplayMatching(current);
    const workArea = display.workArea;
    const maxWidth = Math.max(MIN_WIDTH, workArea.width);
    const maxHeight = Math.max(MIN_HEIGHT, workArea.height);
    const width = finiteNumber(bounds.width)
      ? Math.min(maxWidth, Math.max(MIN_WIDTH, Math.round(bounds.width)))
      : current.width;
    const height = finiteNumber(bounds.height)
      ? Math.min(maxHeight, Math.max(MIN_HEIGHT, Math.round(bounds.height)))
      : current.height;
    const x = finiteNumber(bounds.x) ? Math.round(bounds.x) : current.x;
    const y = finiteNumber(bounds.y) ? Math.round(bounds.y) : current.y;

    win.setBounds({ x, y, width, height });
    return true;
  }

  startResize() {
    // The v1.7 frameless renderer computes resize bounds locally and sends them
    // through setBounds. This explicit no-op retains its future IPC contract
    // without exposing an unsupported native-resize primitive.
    return false;
  }

  toggleFullscreen() {
    const win = this.get();
    if (!win) return false;
    win.setFullScreen(!win.isFullScreen());
    return win.isFullScreen();
  }

  exitFullscreen() {
    const win = this.get();
    if (win && win.isFullScreen()) win.setFullScreen(false);
  }

  isFullscreen() {
    const win = this.get();
    return Boolean(win && win.isFullScreen());
  }
}

module.exports = WindowManager;
module.exports.recoveredWindowBounds = recoveredWindowBounds;
module.exports.rectsIntersect = rectsIntersect;
