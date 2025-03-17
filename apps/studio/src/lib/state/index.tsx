import { MainChannels } from '@onlook/models/constants';
import { makeAutoObservable } from 'mobx';

export class AppStateManager {
    cleaningUp = false;

    constructor() {
        makeAutoObservable(this);
        this.listenForAppStateChanges();
    }

    private listenForAppStateChanges() {
        window.api.on(MainChannels.CLEAN_UP_BEFORE_QUIT, async (e, args) => {
            this.cleaningUp = true;
        });
    }
}
