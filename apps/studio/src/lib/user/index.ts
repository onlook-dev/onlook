import { makeAutoObservable } from 'mobx';
import { UserSettingsManager } from './settings';
import { SubscriptionManager } from './subscription';
import { LanguageManager } from './language';

export class UserManager {
    private subscriptionManager = new SubscriptionManager();
    private settingsManager = new UserSettingsManager();
    private languageManager = new LanguageManager();

    constructor() {
        makeAutoObservable(this);
    }

    get subscription() {
        return this.subscriptionManager;
    }

    get settings() {
        return this.settingsManager;
    }

    get language() {
        return this.languageManager;
    }
}
