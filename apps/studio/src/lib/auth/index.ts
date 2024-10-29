import { makeAutoObservable } from 'mobx';
import { sendAnalytics } from '../utils';
import { APP_SCHEMA, MainChannels } from '/common/constants';
import type { UserMetadata } from '/common/models/settings';
import supabase from '@onlook/supabase/clients';

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
        this.userMetadata = (await window.api.invoke(
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

        window.api.invoke(MainChannels.OPEN_EXTERNAL_WINDOW, data.url);
        sendAnalytics('sign in', { provider });
    }

    signOut() {
        if (!supabase) {
            throw new Error('No backend connected');
        }
        sendAnalytics('sign out');
        supabase.auth.signOut();
        window.api.invoke(MainChannels.SIGN_OUT);
    }
}
