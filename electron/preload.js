const {
    contextBridge,
    ipcRenderer
} = require('electron');


// =========================================================
// ASCEND PRELOAD API
// =========================================================

contextBridge.exposeInMainWorld('ascend', {

    // =====================================================
    // APP
    // =====================================================

    isElectron: true,

    platform: process.platform,

    getAppVersion: () => {

        return ipcRenderer.invoke(
            'get-app-version'
        );
    },


    getAppPath: (name) => {

        const allowedPaths = [
            'home',
            'appData',
            'userData',
            'documents',
            'downloads',
            'desktop'
        ];

        if (!allowedPaths.includes(name)) {

            return Promise.reject(
                new Error('Invalid app path')
            );
        }

        return ipcRenderer.invoke(
            'get-app-path',
            name
        );
    },


    // =====================================================
    // NATIVE FILE DIALOGS
    // =====================================================

    openFile: () => {

        return ipcRenderer.invoke(
            'dialog-open-file'
        );
    },


    saveFile: (options = {}) => {

        if (
            !options ||
            typeof options !== 'object'
        ) {
            options = {};
        }

        return ipcRenderer.invoke(
            'dialog-save-file',
            options
        );
    },


    selectFolder: () => {

        return ipcRenderer.invoke(
            'dialog-select-folder'
        );
    },


    // =====================================================
    // FILESYSTEM
    // =====================================================

    writeFile: (filePath, data) => {

        if (
            typeof filePath !== 'string' ||
            !filePath.trim()
        ) {

            return Promise.reject(
                new Error('Invalid file path')
            );
        }

        if (typeof data !== 'string') {

            return Promise.reject(
                new Error('File data must be a string')
            );
        }

        return ipcRenderer.invoke(
            'file-write',
            {
                filePath,
                data
            }
        );
    },


    readFile: (filePath) => {

        if (
            typeof filePath !== 'string' ||
            !filePath.trim()
        ) {

            return Promise.reject(
                new Error('Invalid file path')
            );
        }

        return ipcRenderer.invoke(
            'file-read',
            filePath
        );
    },


    // =====================================================
    // WINDOW — BASIC CONTROLS
    // =====================================================

    minimizeWindow: () => {

        return ipcRenderer.invoke(
            'window-minimize'
        );
    },


    maximizeWindow: () => {

        return ipcRenderer.invoke(
            'window-maximize'
        );
    },


    closeWindow: () => {

        return ipcRenderer.invoke(
            'window-close'
        );
    },


    // =====================================================
    // WINDOW — STATE
    // =====================================================

    isMaximized: () => {

        return ipcRenderer.invoke(
            'window-is-maximized'
        );
    },


    getWindowBounds: () => {

        return ipcRenderer.invoke(
            'window-get-bounds'
        );
    },


    // =====================================================
    // WINDOW — RESIZE
    // =====================================================

    startWindowResize: (direction) => {

        const validDirections = [
            'top',
            'bottom',
            'left',
            'right',
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right'
        ];

        if (!validDirections.includes(direction)) {

            return Promise.reject(
                new Error(
                    'Invalid resize direction'
                )
            );
        }

        return ipcRenderer.invoke(
            'window-start-resize',
            direction
        );
    },


    setWindowBounds: (bounds) => {

        if (
            !bounds ||
            typeof bounds !== 'object'
        ) {
            return;
        }

        ipcRenderer.send(
            'window-set-bounds',
            bounds
        );
    },


    // =====================================================
    // WINDOW — FULLSCREEN
    // =====================================================

    toggleFullscreen: () => {

        return ipcRenderer.invoke(
            'window-toggle-fullscreen'
        );
    },


    exitFullscreen: () => {

        return ipcRenderer.invoke(
            'window-exit-fullscreen'
        );
    },


    isFullscreen: () => {

        return ipcRenderer.invoke(
            'window-is-fullscreen'
        );
    },


    // =====================================================
    // WINDOW — EVENTS
    // =====================================================

    onWindowMaximizedChange: (callback) => {

        if (typeof callback !== 'function') {
            return;
        }

        const handler = (
            event,
            isMaximized
        ) => {

            callback(isMaximized);
        };

        ipcRenderer.on(
            'window-maximized',
            handler
        );

        // Allows the renderer to remove the listener.
        return () => {

            ipcRenderer.removeListener(
                'window-maximized',
                handler
            );
        };
    },


    onWindowFullscreenChange: (callback) => {

        if (typeof callback !== 'function') {
            return;
        }

        const handler = (
            event,
            isFullscreen
        ) => {

            callback(isFullscreen);
        };

        ipcRenderer.on(
            'window-fullscreen',
            handler
        );

        return () => {

            ipcRenderer.removeListener(
                'window-fullscreen',
                handler
            );
        };
    }

});