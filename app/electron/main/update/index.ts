import log from 'electron-log';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

export class AppUpdater {
    constructor() {
        log.transports.file.level = 'info';
        autoUpdater.logger = log;
        autoUpdater.autoDownload = true;
        autoUpdater.checkForUpdatesAndNotify();
        this.listen();
    }

    listen() {
        autoUpdater.on('update-available', () => {
            log.info('Update available');
        });

        autoUpdater.on('update-not-available', () => {
            log.info('Update not available');
        });

        autoUpdater.on('download-progress', (progress) => {
            log.info(`Download progress: ${progress.percent}`);
        });

        autoUpdater.on('update-downloaded', () => {
            log.info('Update downloaded');
            autoUpdater.quitAndInstall();
        });
    }
}
