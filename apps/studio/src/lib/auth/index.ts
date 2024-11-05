import { APP_SCHEMA, MainChannels } from '@onlook/models/constants';
import type { UserMetadata } from '@onlook/models/settings';
import supabase from '@onlook/supabase/clients';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel, sendAnalytics } from '../utils';

export class AuthManager {
    authenticated = false;
    userMetadata: UserMetadata | null = null;
    isAuthEnabled = !!supabase && !!supabase.auth;

    constructor() {
        makeAutoObservable(this);
        this.fetchUserMetadata();
        this.listenForAuthEvents();
    }

    async fetchUserMetadata() {
        this.userMetadata = (await invokeMainChannel(
            MainChannels.GET_USER_METADATA,
        )) as UserMetadata;
        if (this.userMetadata) {
            this.authenticated = true;
        }
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

        invokeMainChannel(MainChannels.OPEN_EXTERNAL_WINDOW, data.url);
        sendAnalytics('sign in', { provider });
    }

    signOut() {
        if (!supabase) {
            throw new Error('No backend connected');
        }
        sendAnalytics('sign out');
        supabase.auth.signOut();
        invokeMainChannel(MainChannels.SIGN_OUT);
    }
}
