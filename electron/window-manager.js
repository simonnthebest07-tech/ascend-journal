const {
    BrowserWindow,
    screen
} = require('electron');

const path = require('path');
const windowStateKeeper = require('electron-window-state');

class WindowManager {

    constructor() {

        this.window = null;
        this.windowState = null;

        // Minimum window dimensions
        this.MIN_WIDTH = 1100;
        this.MIN_HEIGHT = 700;

        // Display event handlers
        this.handleDisplayRemoved =
            this.handleDisplayRemoved.bind(this);

        this.handleDisplayMetricsChanged =
            this.handleDisplayMetricsChanged.bind(this);

        this.displayListenersRegistered = false;
    }


    // =========================================================
    // CREATE WINDOW
    // =========================================================

    create() {

        // Prevent duplicate windows
        if (
            this.window &&
            !this.window.isDestroyed()
        ) {
            return this.window;
        }


        // =====================================================
        // WINDOW STATE
        // =====================================================

        this.windowState = windowStateKeeper({

            defaultWidth: 1440,
            defaultHeight: 900

        });


        const width = Math.max(
            this.MIN_WIDTH,
            this.windowState.width
        );


        const height = Math.max(
            this.MIN_HEIGHT,
            this.windowState.height
        );


        // =====================================================
        // VALIDATE SAVED POSITION
        // =====================================================

        const position =
            this.validateWindowPosition(
                this.windowState.x,
                this.windowState.y,
                width,
                height
            );


        // =====================================================
        // CREATE BROWSER WINDOW
        // =====================================================

        this.window = new BrowserWindow({

            x: position.x,
            y: position.y,

            width,
            height,

            minWidth: this.MIN_WIDTH,
            minHeight: this.MIN_HEIGHT,

            frame: false,

            backgroundColor: '#050608',

            show: false,

            webPreferences: {

                preload: path.join(
                    __dirname,
                    'preload.js'
                ),

                contextIsolation: true,

                nodeIntegration: false,

                sandbox: true
            }
        });


        // =====================================================
        // WINDOW STATE KEEPER
        // =====================================================

        this.windowState.manage(
            this.window
        );


        // =====================================================
        // DISPLAY MONITORING
        // =====================================================

        this.registerDisplayListeners();


        // =====================================================
        // READY TO SHOW
        // =====================================================

        this.window.once(
            'ready-to-show',
            () => {

                if (
                    !this.window ||
                    this.window.isDestroyed()
                ) {
                    return;
                }

                this.ensureWindowVisible();

                this.window.show();

            }
        );


        // =====================================================
        // MAXIMIZE
        // =====================================================

        this.window.on(
            'maximize',
            () => {

                if (
                    !this.window ||
                    this.window.isDestroyed()
                ) {
                    return;
                }

                this.window.webContents.send(
                    'window-maximized',
                    true
                );

            }
        );


        // =====================================================
        // UNMAXIMIZE
        // =====================================================

        this.window.on(
            'unmaximize',
            () => {

                if (
                    !this.window ||
                    this.window.isDestroyed()
                ) {
                    return;
                }

                this.window.webContents.send(
                    'window-maximized',
                    false
                );

            }
        );


        // =====================================================
        // FULLSCREEN
        // =====================================================

        this.window.on(
            'enter-full-screen',
            () => {

                if (
                    !this.window ||
                    this.window.isDestroyed()
                ) {
                    return;
                }

                this.window.webContents.send(
                    'window-fullscreen',
                    true
                );

            }
        );


        this.window.on(
            'leave-full-screen',
            () => {

                if (
                    !this.window ||
                    this.window.isDestroyed()
                ) {
                    return;
                }

                this.window.webContents.send(
                    'window-fullscreen',
                    false
                );

            }
        );


        // =====================================================
        // LOAD ASCEND
        // =====================================================

        this.window.loadFile(
            path.join(
                __dirname,
                '../index.html'
            )
        );


        // =====================================================
        // LOAD ERROR
        // =====================================================

        this.window.webContents.on(
            'did-fail-load',
            (
                event,
                errorCode,
                errorDescription
            ) => {

                console.error(
                    'ASCEND failed to load:',
                    errorCode,
                    errorDescription
                );

            }
        );


        // =====================================================
        // RENDERER CRASH
        // =====================================================

        this.window.webContents.on(
            'render-process-gone',
            (
                event,
                details
            ) => {

                console.error(
                    'ASCEND renderer process stopped:',
                    details
                );

            }
        );


        // =====================================================
        // WINDOW CLOSED
        // =====================================================

        this.window.on(
            'closed',
            () => {

                this.unregisterDisplayListeners();

                this.window = null;

                this.windowState = null;

            }
        );


        // =====================================================
        // DEVELOPMENT TOOLS
        // =====================================================

        if (
            !this.isProduction()
        ) {

            this.window.webContents.openDevTools();

        }


        return this.window;
    }


    // =========================================================
    // DISPLAY LISTENERS
    // =========================================================

    registerDisplayListeners() {

        if (
            this.displayListenersRegistered
        ) {
            return;
        }


        screen.on(
            'display-removed',
            this.handleDisplayRemoved
        );


        screen.on(
            'display-metrics-changed',
            this.handleDisplayMetricsChanged
        );


        this.displayListenersRegistered = true;
    }


    unregisterDisplayListeners() {

        if (
            !this.displayListenersRegistered
        ) {
            return;
        }


        screen.removeListener(
            'display-removed',
            this.handleDisplayRemoved
        );


        screen.removeListener(
            'display-metrics-changed',
            this.handleDisplayMetricsChanged
        );


        this.displayListenersRegistered = false;
    }


    // =========================================================
    // DISPLAY REMOVED
    // =========================================================

    handleDisplayRemoved() {

        if (
            !this.window ||
            this.window.isDestroyed()
        ) {
            return;
        }


        setTimeout(
            () => {

                this.ensureWindowVisible();

            },
            100
        );
    }


    // =========================================================
    // DISPLAY METRICS CHANGED
    // =========================================================

    handleDisplayMetricsChanged() {

        if (
            !this.window ||
            this.window.isDestroyed()
        ) {
            return;
        }


        setTimeout(
            () => {

                this.ensureWindowVisible();

            },
            100
        );
    }


    // =========================================================
    // VALIDATE WINDOW POSITION
    // =========================================================

    validateWindowPosition(
        x,
        y,
        width,
        height
    ) {

        // No saved position
        if (
            typeof x !== 'number' ||
            typeof y !== 'number'
        ) {

            return this.getCenteredPosition(
                width,
                height
            );
        }


        const windowRight =
            x + width;

        const windowBottom =
            y + height;


        const displays =
            screen.getAllDisplays();


        // Check whether any monitor contains
        // a visible portion of the window.
        for (
            const display of displays
        ) {

            const area =
                display.workArea;


            const horizontalOverlap =
                windowRight > area.x &&
                x < area.x + area.width;


            const verticalOverlap =
                windowBottom > area.y &&
                y < area.y + area.height;


            if (
                horizontalOverlap &&
                verticalOverlap
            ) {

                return {
                    x,
                    y
                };
            }
        }


        // Saved position is no longer valid.
        return this.getCenteredPosition(
            width,
            height
        );
    }


    // =========================================================
    // CENTER WINDOW
    // =========================================================

    getCenteredPosition(
        width,
        height
    ) {

        const primaryDisplay =
            screen.getPrimaryDisplay();


        const area =
            primaryDisplay.workArea;


        return {

            x: Math.round(
                area.x +
                (area.width - width) / 2
            ),

            y: Math.round(
                area.y +
                (area.height - height) / 2
            )
        };
    }


    // =========================================================
    // ENSURE WINDOW IS VISIBLE
    // =========================================================

    ensureWindowVisible() {

        if (
            !this.window ||
            this.window.isDestroyed()
        ) {
            return;
        }


        // Don't interfere with special states
        if (
            this.window.isMaximized() ||
            this.window.isFullScreen()
        ) {
            return;
        }


        const bounds =
            this.window.getBounds();


        const displays =
            screen.getAllDisplays();


        const visible =
            displays.some(
                display => {

                    const area =
                        display.workArea;


                    const horizontal =
                        bounds.x <
                            area.x + area.width &&
                        bounds.x + bounds.width >
                            area.x;


                    const vertical =
                        bounds.y <
                            area.y + area.height &&
                        bounds.y + bounds.height >
                            area.y;


                    return (
                        horizontal &&
                        vertical
                    );
                }
            );


        if (visible) {
            return;
        }


        // Window is completely outside
        // all available monitors.
        const position =
            this.getCenteredPosition(
                bounds.width,
                bounds.height
            );


        this.window.setBounds({

            x: position.x,
            y: position.y,

            width: bounds.width,
            height: bounds.height

        });
    }


    // =========================================================
    // GET WINDOW
    // =========================================================

    get() {

        return this.window;
    }


    // =========================================================
    // GET BOUNDS
    // =========================================================

    getBounds() {

        if (
            !this.window ||
            this.window.isDestroyed()
        ) {
            return null;
        }


        return this.window.getBounds();
    }


    // =========================================================
    // SET BOUNDS
    // =========================================================

    setBounds(bounds) {

        if (
            !this.window ||
            this.window.isDestroyed()
        ) {
            return false;
        }


        // Don't resize special states.
        if (
            this.window.isMaximized() ||
            this.window.isFullScreen()
        ) {
            return false;
        }


        if (
            !bounds ||
            typeof bounds !== 'object'
        ) {
            return false;
        }


        let {
            x,
            y,
            width,
            height
        } = bounds;


        // Validate coordinates
        if (
            typeof x !== 'number' ||
            typeof y !== 'number'
        ) {
            return false;
        }


        // Validate dimensions
        if (
            typeof width !== 'number' ||
            typeof height !== 'number'
        ) {
            return false;
        }


        width = Math.max(
            this.MIN_WIDTH,
            Math.round(width)
        );


        height = Math.max(
            this.MIN_HEIGHT,
            Math.round(height)
        );


        x = Math.round(x);
        y = Math.round(y);


        this.window.setBounds({

            x,
            y,

            width,
            height

        });


        return true;
    }


    // =========================================================
    // MINIMIZE
    // =========================================================

    minimize() {

        if (
            !this.window ||
            this.window.isDestroyed()
        ) {
            return;
        }


        this.window.minimize();
    }


    // =========================================================
    // MAXIMIZE / RESTORE
    // =========================================================

    toggleMaximize() {

        if (
            !this.window ||
            this.window.isDestroyed()
        ) {
            return;
        }


        if (
            this.window.isMaximized()
        ) {

            this.window.unmaximize();

        } else {

            this.window.maximize();

        }
    }


    // =========================================================
    // IS MAXIMIZED
    // =========================================================

    isMaximized() {

        if (
            !this.window ||
            this.window.isDestroyed()
        ) {
            return false;
        }


        return this.window.isMaximized();
    }


    // =========================================================
    // CLOSE
    // =========================================================

    close() {

        if (
            !this.window ||
            this.window.isDestroyed()
        ) {
            return;
        }


        this.window.close();
    }


    // =========================================================
    // FULLSCREEN
    // =========================================================

    toggleFullscreen() {

        if (
            !this.window ||
            this.window.isDestroyed()
        ) {
            return false;
        }


        const fullscreen =
            this.window.isFullScreen();


        this.window.setFullScreen(
            !fullscreen
        );


        return !fullscreen;
    }


    // =========================================================
    // EXIT FULLSCREEN
    // =========================================================

    exitFullscreen() {

        if (
            !this.window ||
            this.window.isDestroyed()
        ) {
            return;
        }


        if (
            this.window.isFullScreen()
        ) {

            this.window.setFullScreen(
                false
            );
        }
    }


    // =========================================================
    // IS FULLSCREEN
    // =========================================================

    isFullscreen() {

        if (
            !this.window ||
            this.window.isDestroyed()
        ) {
            return false;
        }


        return this.window.isFullScreen();
    }


    // =========================================================
    // START RESIZE
    // =========================================================
    //
    // The renderer performs the actual drag calculation.
    // Electron receives the resulting bounds through
    // setBounds().
    // =========================================================

    startResize(direction) {

        if (
            !this.window ||
            this.window.isDestroyed()
        ) {
            return false;
        }


        if (
            this.window.isMaximized() ||
            this.window.isFullScreen()
        ) {
            return false;
        }


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


        return validDirections.includes(
            direction
        );
    }


    // =========================================================
    // PRODUCTION CHECK
    // =========================================================

    isProduction() {

        try {

            const {
                app
            } = require('electron');

            return app.isPackaged;

        } catch {

            return false;

        }
    }
}


// =========================================================
// EXPORT
// =========================================================

module.exports = WindowManager;