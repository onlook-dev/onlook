import { makeAutoObservable } from 'mobx';
import { UserSettingsManager } from './settings';
import { SubscriptionManager } from './subscription';

export class UserManager {
    private subscriptionManager = new SubscriptionManager();
    private settingsManager = new UserSettingsManager();

    constructor() {
        makeAutoObservable(this);
    }

    get subscription() {
        return this.subscriptionManager;
    }

    get settings() {
        return this.settingsManager;
    }
}
