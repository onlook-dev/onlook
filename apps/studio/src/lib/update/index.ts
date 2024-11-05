import { MainChannels } from '@onlook/models/constants';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';

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
        invokeMainChannel(MainChannels.QUIT_AND_INSTALL);
    }
}
