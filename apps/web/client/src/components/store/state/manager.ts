import { SettingsTabValue } from '@onlook/models';
import { makeAutoObservable } from 'mobx';

export class StateManager {
    isSubscriptionModalOpen = false;
    isSettingsModalOpen = false;
    settingsTab: SettingsTabValue | string = SettingsTabValue.SITE;

    constructor() {
        makeAutoObservable(this);
    }
}