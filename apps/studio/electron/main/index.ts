import { APP_NAME, APP_SCHEMA } from '@onlook/models/constants';
import { BrowserWindow, app, shell } from 'electron';
import fixPath from 'fix-path';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendAnalytics } from './analytics';
import { handleAuthCallback } from './auth';
import { listenForIpcMessages } from './events';
import run from './run';
import terminal from './run/terminal';
import { updater } from './update';

// Help main inherit $PATH defined in dotfiles (.bashrc/.bash_profile/.zshrc/etc).
fixPath();

export let mainWindow: BrowserWindow | null = null;
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Constants
const MAIN_DIST = path.join(__dirname, '../../dist-electron');
const RENDERER_DIST = path.join(__dirname, '../../dist');
const PRELOAD_PATH = path.join(__dirname, '../preload/index.js');
const INDEX_HTML = path.join(RENDERER_DIST, 'index.html');
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

// Environment setup
const setupEnvironment = () => {
    process.env.APP_ROOT = path.join(__dirname, '../..');
    process.env.WEBVIEW_PRELOAD_PATH = path.join(__dirname, '../preload/webview.js');
    process.env.APP_VERSION = app.getVersion();
    process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
        ? path.join(process.env.APP_ROOT, 'public')
        : RENDERER_DIST;
};

// Platform-specific configurations
const configurePlatformSpecifics = () => {
    if (os.release().startsWith('6.1')) {
        app.disableHardwareAcceleration();
    }

    if (process.platform === 'win32') {
        app.setAppUserModelId(app.getName());
    }
};

// Protocol setup
const setupProtocol = () => {
    if (process.defaultApp && process.argv.length >= 2) {
        app.setAsDefaultProtocolClient(APP_SCHEMA, process.execPath, [
            path.resolve(process.argv[1]),
        ]);
    } else {
        app.setAsDefaultProtocolClient(APP_SCHEMA);
    }
};

const createWindow = () => {
    mainWindow = new BrowserWindow({
        title: APP_NAME,
        icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
        titleBarStyle: 'hiddenInset',
        frame: false,
        webPreferences: {
            preload: PRELOAD_PATH,
            webviewTag: true,
        },
    });
    return mainWindow;
};

const loadWindowContent = (win: BrowserWindow) => {
    VITE_DEV_SERVER_URL ? win.loadURL(VITE_DEV_SERVER_URL) : win.loadFile(INDEX_HTML);
};

const initMainWindow = () => {
    const win = createWindow();
    win.maximize();
    loadWindowContent(win);
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });
};

let isCleaningUp = false;

const cleanup = async () => {
    if (isCleaningUp) {
        return;
    }
    isCleaningUp = true;

    await run.stopAll();
    await terminal.killAll();
};

const cleanUpAndExit = async () => {
    await cleanup();
    process.exit(0);
};

const listenForExitEvents = () => {
    process.on('before-quit', (e) => {
        e.preventDefault();
        cleanUpAndExit();
    });
    process.on('exit', cleanUpAndExit);
    process.on('SIGTERM', cleanUpAndExit);
    process.on('SIGINT', cleanUpAndExit);

    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        sendAnalytics('uncaught exception', { error });
        if (error instanceof TypeError || error instanceof ReferenceError) {
            cleanup();
        }
    });
};

const setupAppEventListeners = () => {
    app.whenReady().then(() => {
        listenForExitEvents();
        initMainWindow();
    });

    app.on('ready', () => {
        updater.listen();
        sendAnalytics('start app');
    });

    app.on('window-all-closed', () => {
        mainWindow = null;
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('second-instance', (_, commandLine) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.focus();
        }
        const url = commandLine.find((arg) => arg.startsWith(`${APP_SCHEMA}://`));
        if (url && process.platform === 'win32') {
            handleAuthCallback(url);
        }
    });

    app.on('activate', () => {
        BrowserWindow.getAllWindows().length
            ? BrowserWindow.getAllWindows()[0].focus()
            : initMainWindow();
    });

    app.on('open-url', (event, url) => {
        event.preventDefault();
        handleAuthCallback(url);
    });

    app.on('quit', () => sendAnalytics('quit app'));
};

// Main function
const main = () => {
    setupEnvironment();
    configurePlatformSpecifics();

    if (!app.requestSingleInstanceLock()) {
        app.quit();
        process.exit(0);
    }

    setupProtocol();
    setupAppEventListeners();
    listenForIpcMessages();
};

main();
