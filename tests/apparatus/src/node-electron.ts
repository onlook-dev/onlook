import { mockMainProcessElectron } from './electron.js';

const electron = mockMainProcessElectron();

export const {
  app,
  BrowserWindow,
  BaseWindow,
  WebContentsView,
  screen,
  ipcMain,
  Notification,
  webContents,
  session,
  utilityProcess,
  dialog,
  shell,
  safeStorage,
} = electron;

export default electron.default;
