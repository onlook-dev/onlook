import pkg from 'electron-updater';
const { autoUpdater } = pkg;

export default class AutoUpdateManager {
    constructor() {
        autoUpdater.checkForUpdatesAndNotify();
    }
}
