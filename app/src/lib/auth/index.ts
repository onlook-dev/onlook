import { makeAutoObservable } from 'mobx';
import { MainChannels } from '/common/constants';
import { UserMetadata } from '/common/models/settings';

export class AuthManager {
    authenticated = false;
    userMetadata: UserMetadata | null = null;

    constructor() {
        makeAutoObservable(this);
        this.fetchUserMetadata();
        this.listenForAuthEvents();
    }

    async fetchUserMetadata() {
        this.userMetadata = await window.api.invoke(MainChannels.GET_USER_METADATA);
    }

    listenForAuthEvents() {
        window.api.on(MainChannels.USER_SIGNED_IN, async (e, args) => {
            this.authenticated = true;
            this.fetchUserMetadata();
        });

        window.api.on(MainChannels.USER_SIGNED_OUT, async (e, args) => {
            this.authenticated = false;
            this.userMetadata = null;
        });
    }
}
