const {
    app,
    BrowserWindow,
    ipcMain,
    globalShortcut,
    dialog
} = require('electron');

const fs = require('fs/promises');
const path = require('path');

const WindowManager = require('./window-manager');


// =========================================================
// ASCEND APPLICATION
// =========================================================

app.setName('ASCEND Journal');

const isDev = !app.isPackaged;


// =========================================================
// WINDOW MANAGER
// =========================================================

const windowManager = new WindowManager();


// =========================================================
// SINGLE INSTANCE
// =========================================================

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {

    app.quit();

} else {

    app.on('second-instance', () => {

        const win = windowManager.get();

        if (!win) {
            return;
        }

        if (win.isMinimized()) {
            win.restore();
        }

        if (!win.isVisible()) {
            win.show();
        }

        win.focus();
    });
}


// =========================================================
// IPC — APPLICATION
// =========================================================

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});


// =========================================================
// IPC — WINDOW CONTROLS
// =========================================================

ipcMain.handle('window-minimize', () => {
    windowManager.minimize();
});


ipcMain.handle('window-maximize', () => {
    windowManager.toggleMaximize();
});


ipcMain.handle('window-close', () => {
    windowManager.close();
});


ipcMain.handle('window-is-maximized', () => {
    return windowManager.isMaximized();
});


// =========================================================
// IPC — WINDOW BOUNDS
// =========================================================

ipcMain.handle('window-get-bounds', () => {
    return windowManager.getBounds();
});


ipcMain.on('window-set-bounds', (event, bounds) => {

    if (!bounds || typeof bounds !== 'object') {
        return;
    }

    windowManager.setBounds(bounds);
});


// =========================================================
// IPC — WINDOW RESIZE
// =========================================================

ipcMain.handle(
    'window-start-resize',
    (event, direction) => {

        return windowManager.startResize(direction);
    }
);


// =========================================================
// IPC — FULLSCREEN
// =========================================================

ipcMain.handle('window-toggle-fullscreen', () => {
    return windowManager.toggleFullscreen();
});


ipcMain.handle('window-exit-fullscreen', () => {
    windowManager.exitFullscreen();
});


ipcMain.handle('window-is-fullscreen', () => {
    return windowManager.isFullscreen();
});


// =========================================================
// IPC — NATIVE FILE DIALOGS
// =========================================================

ipcMain.handle(
    'dialog-open-file',
    async () => {

        const win = windowManager.get();

        if (!win) {
            return null;
        }

        try {

            const result = await dialog.showOpenDialog(
                win,
                {
                    title: 'Open ASCEND Backup',

                    properties: [
                        'openFile'
                    ],

                    filters: [
                        {
                            name: 'ASCEND Backup',
                            extensions: ['json']
                        },
                        {
                            name: 'All Files',
                            extensions: ['*']
                        }
                    ]
                }
            );

            if (result.canceled) {
                return null;
            }

            return result.filePaths[0] || null;

        } catch (error) {

            console.error(
                'ASCEND open dialog failed:',
                error
            );

            return null;
        }
    }
);


ipcMain.handle(
    'dialog-save-file',
    async (event, options = {}) => {

        const win = windowManager.get();

        if (!win) {
            return null;
        }

        try {

            const result = await dialog.showSaveDialog(
                win,
                {
                    title:
                        typeof options.title === 'string'
                            ? options.title
                            : 'Save ASCEND Backup',

                    defaultPath:
                        typeof options.defaultPath === 'string'
                            ? options.defaultPath
                            : 'ASCEND-Backup.json',

                    filters: [
                        {
                            name: 'ASCEND Backup',
                            extensions: ['json']
                        },
                        {
                            name: 'All Files',
                            extensions: ['*']
                        }
                    ]
                }
            );

            if (result.canceled) {
                return null;
            }

            return result.filePath || null;

        } catch (error) {

            console.error(
                'ASCEND save dialog failed:',
                error
            );

            return null;
        }
    }
);


ipcMain.handle(
    'dialog-select-folder',
    async () => {

        const win = windowManager.get();

        if (!win) {
            return null;
        }

        try {

            const result = await dialog.showOpenDialog(
                win,
                {
                    title: 'Select ASCEND Backup Folder',

                    properties: [
                        'openDirectory',
                        'createDirectory'
                    ]
                }
            );

            if (result.canceled) {
                return null;
            }

            return result.filePaths[0] || null;

        } catch (error) {

            console.error(
                'ASCEND folder dialog failed:',
                error
            );

            return null;
        }
    }
);


// =========================================================
// IPC — FILESYSTEM
// =========================================================

ipcMain.handle(
    'file-write',
    async (event, payload) => {

        if (!payload || typeof payload !== 'object') {
            throw new Error('Missing file payload');
        }

        const {
            filePath,
            data
        } = payload;

        if (
            typeof filePath !== 'string' ||
            !filePath.trim()
        ) {
            throw new Error('Invalid file path');
        }

        if (typeof data !== 'string') {
            throw new Error('File data must be a string');
        }

        try {

            await fs.writeFile(
                filePath,
                data,
                'utf8'
            );

            return true;

        } catch (error) {

            console.error(
                'ASCEND file write failed:',
                error
            );

            throw error;
        }
    }
);


ipcMain.handle(
    'file-read',
    async (event, filePath) => {

        if (
            typeof filePath !== 'string' ||
            !filePath.trim()
        ) {
            throw new Error('Invalid file path');
        }

        try {

            const data = await fs.readFile(
                filePath,
                'utf8'
            );

            return data;

        } catch (error) {

            console.error(
                'ASCEND file read failed:',
                error
            );

            throw error;
        }
    }
);


// =========================================================
// IPC — APP PATHS
// =========================================================

ipcMain.handle('get-app-path', (event, name) => {

    const allowedPaths = [
        'home',
        'appData',
        'userData',
        'documents',
        'downloads',
        'desktop'
    ];

    if (!allowedPaths.includes(name)) {
        throw new Error('Invalid app path');
    }

    return app.getPath(name);
});


// =========================================================
// CREATE ASCEND WINDOW
// =========================================================

function createWindow() {
    return windowManager.create();
}


// =========================================================
// APP READY
// =========================================================

app.whenReady().then(() => {

    createWindow();


    // =====================================================
    // F11 — NATIVE FULLSCREEN
    // =====================================================

    const registered = globalShortcut.register(
        'F11',
        () => {

            windowManager.toggleFullscreen();

        }
    );

    if (!registered) {

        console.warn(
            'ASCEND: F11 global shortcut could not be registered.'
        );
    }


    // =====================================================
    // MACOS — RECREATE WINDOW
    // =====================================================

    app.on('activate', () => {

        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }

    });

});


// =========================================================
// APPLICATION QUIT
// =========================================================

app.on('will-quit', () => {

    globalShortcut.unregisterAll();

});


// =========================================================
// ALL WINDOWS CLOSED
// =========================================================

app.on('window-all-closed', () => {

    if (process.platform !== 'darwin') {
        app.quit();
    }

});