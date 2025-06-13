import { createClient } from '@/utils/supabase/client';
import type { UserMetadata } from '@onlook/models';
import type { User as AuthUser } from '@supabase/supabase-js';
import { makeAutoObservable } from 'mobx';
import { LanguageManager } from './language';
import { UserSettingsManager } from './settings';
import { SubscriptionManager } from './subscription';

export class UserManager {
    readonly supabase = createClient();
    readonly settings: UserSettingsManager;
    readonly subscription: SubscriptionManager;
    readonly language = new LanguageManager();
    user: UserMetadata | null = null;

    constructor() {
        makeAutoObservable(this);
        this.settings = new UserSettingsManager(this);
        this.subscription = new SubscriptionManager(this);
        this.fetchUser();
    }

    async fetchUser() {
        const { data, error } = await this.supabase.auth.getUser();
        if (error) {
            console.error(error);
            return;
        }
        this.user = this.fromAuthUser(data.user);
    }

    fromAuthUser(authUser: AuthUser): UserMetadata {
        return {
            id: authUser.id,
            name:
                authUser.user_metadata?.full_name ||
                authUser.user_metadata?.name ||
                authUser.email,
            email: authUser.email,
            avatarUrl: authUser.user_metadata?.avatar_url,
        };
    }

    async signOut() {
        await this.supabase.auth.signOut();
        this.user = null;
    }
}
