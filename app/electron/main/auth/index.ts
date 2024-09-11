import { User, UserMetadata } from '@supabase/supabase-js';
import { PersistenStorage } from '../storage';
import { APP_SCHEMA } from '/common/constants';
import { AuthTokens } from '/common/models/settings';
import supabase from '/common/supabase';

export async function handleAuthCallback(url: string) {
    if (!url.startsWith(APP_SCHEMA + '://auth')) {
        return;
    }

    const fragmentParams = new URLSearchParams(url.split('#')[1]);
    const accessToken = fragmentParams.get('access_token');
    const refreshToken = fragmentParams.get('refresh_token');

    if (!accessToken) {
        throw new Error('No access token found in the URL');
    }

    if (!refreshToken) {
        throw new Error('No refresh token found in the URL');
    }

    storeTokens(accessToken, refreshToken);

    if (!supabase) {
        throw new Error('No backend connected');
    }

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser(accessToken);

    if (error) {
        throw error;
    }

    if (!user) {
        throw new Error('No user found');
    }

    storeUser(user);
}

function storeTokens(accessToken: string, refreshToken: string) {
    const authTokens: AuthTokens = {
        accessToken: accessToken,
        refreshToken: refreshToken,
    };
    PersistenStorage.AUTH_TOKENS.updateEncrypted(authTokens);
}

function storeUser(user: User) {
    const userMetadata: UserMetadata = {
        id: user.id,
        email: user.email,
        name: user.user_metadata.full_name,
        avatarUrl: user.user_metadata.avatar_url,
    };
    PersistenStorage.USER_METADATA.update(userMetadata);
}
