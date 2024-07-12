import { app, ipcMain } from 'electron';
import type { ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from 'electron-updater';
import { createRequire } from 'node:module';
import { MainChannels } from '/common/constants';

const { autoUpdater } = createRequire(import.meta.url)('electron-updater');

export function update(win: Electron.BrowserWindow) {
    // When set to false, the update download will be triggered through the API
    autoUpdater.autoDownload = false;
    autoUpdater.disableWebInstaller = false;
    autoUpdater.allowDowngrade = false;

    autoUpdater.on('checking-for-update', function () {
        console.log('Checking for update...');
    });

    autoUpdater.on('update-available', (arg: UpdateInfo) => {
        console.log('Update available:', arg);
        win.webContents.send('update-can-available', {
            update: true,
            version: app.getVersion(),
            newVersion: arg?.version,
        });
    });

    autoUpdater.on('update-not-available', (arg: UpdateInfo) => {
        console.log('Update not available:', arg);
        win.webContents.send('update-can-available', {
            update: false,
            version: app.getVersion(),
            newVersion: arg?.version,
        });
    });

    ipcMain.handle(MainChannels.CHECK_UPDATE, async () => {
        if (!app.isPackaged) {
            const error = new Error('The update feature is only available after the package.');
            return { message: error.message, error };
        }

        try {
            return await autoUpdater.checkForUpdatesAndNotify();
        } catch (error) {
            return { message: 'Network error', error };
        }
    });

    ipcMain.handle(MainChannels.START_DOWNLOAD, (event: Electron.IpcMainInvokeEvent) => {
        startDownload(
            (error, progressInfo) => {
                if (error) {
                    event.sender.send('update-error', {
                        message: error.message,
                        error,
                    });
                } else {
                    event.sender.send('download-progress', progressInfo);
                }
            },
            () => {
                event.sender.send('update-downloaded');
            },
        );
    });

    ipcMain.handle(MainChannels.QUIT_AND_INSTALL, () => {
        autoUpdater.quitAndInstall(false, true);
    });
}

function startDownload(
    callback: (error: Error | null, info: ProgressInfo | null) => void,
    complete: (event: UpdateDownloadedEvent) => void,
) {
    autoUpdater.on('download-progress', (info: ProgressInfo) => callback(null, info));
    autoUpdater.on('error', (error: Error) => callback(error, null));
    autoUpdater.on('update-downloaded', complete);
    autoUpdater.downloadUpdate();
}
