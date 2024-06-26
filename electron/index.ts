import { BrowserWindow, IpcMainEvent, app, ipcMain, screen } from 'electron';
import isDev from 'electron-is-dev';
import { join } from 'path';
import { MainChannel } from '../src/lib/constants';

function loadWindowHtml(window: BrowserWindow) {
  const port = process.env.PORT || 3000;
  const url = isDev ? `http://localhost:${port}` : join(__dirname, '../src/out/index.html');
  if (isDev) {
    window?.loadURL(url);
  } else {
    window?.loadFile(url);
  }
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const window = new BrowserWindow({
    width,
    height,
    titleBarStyle: 'hidden',
    show: true,
    resizable: true,
    fullscreenable: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      webviewTag: true,
    }
  });

  loadWindowHtml(window);

  if (isDev)
    window.webContents.openDevTools();
}

function initializeApp() {
  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    const macOS = process.platform === 'darwin';
    if (macOS) app.quit();
  });
}

// TODO: Move this to new module
function setMessageListeners() {
  ipcMain.on(MainChannel.NOTIFICATION, (event: IpcMainEvent, message: any) => {
    console.log(message);
    setTimeout(() => event.sender.send('message', 'hi from electron'), 500);
  });
}

initializeApp();
setMessageListeners();