import { BrowserWindow, app, shell } from 'electron';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendAnalytics } from './analytics';
import { listenForIpcMessages } from './events';
import AutoUpdateManager from './update';
import { APP_NAME } from '/common/constants';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '../..');
process.env.WEBVIEW_PRELOAD_PATH = path.join(__dirname, '../preload/webview.js');
process.env.APP_VERSION = app.getVersion();

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
    ? path.join(process.env.APP_ROOT, 'public')
    : RENDERER_DIST;

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) {
    app.disableHardwareAcceleration();
}

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') {
    app.setAppUserModelId(app.getName());
}

if (!app.requestSingleInstanceLock()) {
    app.quit();
    process.exit(0);
}

let win: BrowserWindow | null = null;
const preload = path.join(__dirname, '../preload/index.js');
const indexHtml = path.join(RENDERER_DIST, 'index.html');

function loadWindowContent(win: BrowserWindow) {
    // Load URL or file based on the environment
    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL);
    } else {
        win.loadFile(indexHtml);
    }
}

function createWindow() {
    win = new BrowserWindow({
        title: APP_NAME,
        icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            preload,
            webviewTag: true,
        },
    });
    return win;
}

function initMainWindow() {
    const win = createWindow();
    win.maximize();
    loadWindowContent(win);

    // Ensure links open externally
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });
}

function listenForAppEvents() {
    app.whenReady().then(initMainWindow);

    app.on('ready', () => {
        const updateManager = new AutoUpdateManager();
        sendAnalytics('start app');
    });

    app.on('window-all-closed', () => {
        win = null;
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('second-instance', () => {
        if (win) {
            // Focus on the main window if the user tried to open another
            if (win.isMinimized()) {
                win.restore();
            }
            win.focus();
        }
    });

    app.on('activate', () => {
        const allWindows = BrowserWindow.getAllWindows();
        if (allWindows.length) {
            allWindows[0].focus();
        } else {
            initMainWindow();
        }
    });

    app.on('quit', () => {
        sendAnalytics('quit app');
    });
}

listenForAppEvents();
listenForIpcMessages();
