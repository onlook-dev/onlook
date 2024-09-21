import { makeAutoObservable } from 'mobx';
import { APP_SCHEMA, MainChannels } from '/common/constants';
import { UserMetadata } from '/common/models/settings';
import supabase from '/common/supabase';

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

    async signIn(provider: 'github' | 'google') {
        if (!supabase) {
            throw new Error('No backend connected');
        }

        supabase.auth.signOut();

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                skipBrowserRedirect: true,
                redirectTo: APP_SCHEMA + '://auth',
            },
        });

        if (error) {
            console.error('Authentication error:', error);
            return;
        }

        window.api.invoke(MainChannels.OPEN_EXTERNAL_WINDOW, data.url);
    }

    signOut() {
        if (!supabase) {
            throw new Error('No backend connected');
        }

        supabase.auth.signOut();
        window.api.invoke(MainChannels.SIGN_OUT);
    }
}
