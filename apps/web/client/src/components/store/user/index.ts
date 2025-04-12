import { makeAutoObservable } from 'mobx';
import { LanguageManager } from './language';
import { UserSettingsManager } from './settings';
import { SubscriptionManager } from './subscription';

export class UserManager {
    readonly subscription = new SubscriptionManager();
    readonly settings = new UserSettingsManager();
    readonly language = new LanguageManager();

    constructor() {
        makeAutoObservable(this);
    }

}
