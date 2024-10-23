import { makeAutoObservable } from 'mobx';
import { MainChannels } from '/common/constants';

export class UpdateManager {
    updateAvailable = false;

    constructor() {
        makeAutoObservable(this);
        this.listen();
    }

    listen() {
        window.api.on(MainChannels.UPDATE_DOWNLOADED, async (e, args) => {
            this.updateAvailable = true;
        });

        window.api.on(MainChannels.UPDATE_NOT_AVAILABLE, async (e, args) => {
            this.updateAvailable = false;
        });
    }

    quitAndInstall() {
        window.api.invoke(MainChannels.QUIT_AND_INSTALL);
    }
}
