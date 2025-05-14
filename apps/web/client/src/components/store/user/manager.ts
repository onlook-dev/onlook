import { createClient } from '@/utils/supabase/client';
import { makeAutoObservable } from 'mobx';
import { LanguageManager } from './language';
import { UserSettingsManager } from './settings';
import { SubscriptionManager } from './subscription';

export class UserManager {
    readonly subscription = new SubscriptionManager();
    readonly settings = new UserSettingsManager();
    readonly language = new LanguageManager();
    readonly supabase = createClient();

    private _user: {
        id: string | null;
        name: string | null;
        image: string | null;
    } | null = null;

    constructor() {
        this.fetchUser();
        makeAutoObservable(this);
    }

    get user() {
        return this._user;
    }

    async fetchUser() {
        const { data, error } = await this.supabase.auth.getUser();
        if (error) {
            throw new Error(error.message);
        }
        this._user = {
            id: data.user.id,
            name:
                data.user.user_metadata?.full_name ||
                data.user.user_metadata?.name ||
                data.user.email ||
                'Anonymous',
            image: data.user.user_metadata?.avatar_url || null,
        };
    }

    async signOut() {
        await this.supabase.auth.signOut();
        this._user = null;
    }
}
