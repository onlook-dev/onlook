import { APP_SCHEMA, MainChannels } from '@onlook/models/constants';
import type { AuthTokens, UserMetadata } from '@onlook/models/settings';
import supabase from '@onlook/supabase/clients';
import type { User } from '@supabase/supabase-js';
import { mainWindow } from '..';
import analytics from '../analytics';
import { PersistentStorage } from '../storage';

export async function handleAuthCallback(url: string) {
    if (!url.startsWith(APP_SCHEMA + '://auth')) {
        return;
    }

    const authTokens = getToken(url);

    if (!supabase) {
        throw new Error('No backend connected');
    }

    await supabase.auth.setSession({
        access_token: authTokens.accessToken,
        refresh_token: authTokens.refreshToken,
    });

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser(authTokens.accessToken);

    if (error) {
        throw error;
    }

    if (!user) {
        throw new Error('No user found');
    }

    const userMetadata = getUserMetadata(user);
    PersistentStorage.USER_METADATA.replace(userMetadata);

    analytics.identify(userMetadata);
    emitAuthEvent();
}

function emitAuthEvent() {
    mainWindow?.webContents.send(MainChannels.USER_SIGNED_IN);
}

function getToken(url: string): AuthTokens {
    const fragmentParams = new URLSearchParams(url.split('#')[1]);

    const accessToken = fragmentParams.get('access_token');
    const refreshToken = fragmentParams.get('refresh_token');
    const expiresAt = fragmentParams.get('expires_at');
    const expiresIn = fragmentParams.get('expires_in');
    const providerToken = fragmentParams.get('provider_token');
    const tokenType = fragmentParams.get('token_type');

    if (!accessToken || !refreshToken || !expiresAt || !expiresIn || !providerToken || !tokenType) {
        throw new Error('Invalid token');
    }

    return {
        accessToken,
        refreshToken,
        expiresAt,
        expiresIn,
        providerToken,
        tokenType,
    };
}

function getUserMetadata(user: User): UserMetadata {
    const userMetadata: UserMetadata = {
        id: user.id,
        email: user.email,
        name: user.user_metadata.full_name,
        avatarUrl: user.user_metadata.avatar_url,
    };
    return userMetadata;
}

export async function getRefreshedAuthTokens(): Promise<AuthTokens> {
    if (!supabase) {
        throw new Error('No backend connected');
    }

    // Get a refreshed session
    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    if (error || !session) {
        throw new Error('Failed to refresh session, you may need to sign in again. ' + error);
    }

    const refreshedAuthTokens: AuthTokens = {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at?.toString() ?? '',
        expiresIn: session.expires_in.toString(),
        providerToken: session.provider_token ?? '',
        tokenType: session.token_type ?? '',
    };
    return refreshedAuthTokens;
}
