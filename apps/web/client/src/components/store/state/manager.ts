import { makeAutoObservable } from 'mobx';

import { SettingsTabValue } from '@onlook/models';

export class StateManager {
    isSubscriptionModalOpen = false;
    isSettingsModalOpen = false;
    settingsTab: SettingsTabValue | string = SettingsTabValue.SITE;

    constructor() {
        makeAutoObservable(this);
    }
}
