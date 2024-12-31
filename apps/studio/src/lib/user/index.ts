import { MainChannels } from '@onlook/models/constants';
import type { UserSettings } from '@onlook/models/settings';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';

export class UserManager {
    user: UserSettings | null = null;

    constructor() {
        makeAutoObservable(this);
        this.fetchUser();
    }

    async fetchUser() {
        this.user = await invokeMainChannel(MainChannels.GET_USER_SETTINGS);
    }

    async updateUserSettings(settings: Partial<UserSettings>) {
        this.user = { ...this.user, ...settings };
        await invokeMainChannel(MainChannels.UPDATE_USER_SETTINGS, settings);
    }
}
