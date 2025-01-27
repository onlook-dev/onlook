import pkg from 'electron-updater';
const { autoUpdater } = pkg;

import { MainChannels } from '@onlook/models/constants';
import log from 'electron-log';
import { cleanup, mainWindow } from '..';

class AppUpdater {
    static instance: AppUpdater | null = null;

    static getInstance() {
        if (!AppUpdater.instance) {
            AppUpdater.instance = new AppUpdater();
        }
        return AppUpdater.instance;
    }

    private constructor() {
        if (AppUpdater.instance) {
            return AppUpdater.instance;
        }

        log.transports.file.level = 'info';
        autoUpdater.logger = log;
        autoUpdater.autoDownload = true;
        AppUpdater.instance = this;
    }

    async quitAndInstall() {
        await cleanup();
        autoUpdater.quitAndInstall();
    }

    listen() {
        const checkForUpdates = () => {
            autoUpdater.checkForUpdates().catch((err) => {
                log.error('Error checking for updates:', err);
            });
        };

        checkForUpdates();
        setInterval(checkForUpdates, 60 * 60 * 1000);

        autoUpdater.on('update-available', () => {
            log.info('Update available');
        });

        autoUpdater.on('update-not-available', () => {
            log.info('Update not available');
            mainWindow?.webContents.send(MainChannels.UPDATE_NOT_AVAILABLE);
        });

        autoUpdater.on('download-progress', (progress) => {
            let log_message = 'Download speed: ' + progress.bytesPerSecond;
            log_message = log_message + ' - Downloaded ' + progress.percent + '%';
            log_message = log_message + ' (' + progress.transferred + '/' + progress.total + ')';
            log.info(log_message);
        });

        autoUpdater.on('update-downloaded', () => {
            log.info('Update downloaded');
            mainWindow?.webContents.send(MainChannels.UPDATE_DOWNLOADED);
        });

        autoUpdater.on('error', (err) => {
            log.error('AutoUpdater error:', err);
        });
    }
}

export const updater = AppUpdater.getInstance();
