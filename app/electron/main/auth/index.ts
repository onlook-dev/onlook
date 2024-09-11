import { User } from '@supabase/supabase-js';
import { safeStorage } from 'electron';
import { APP_SCHEMA } from '/common/constants';
import supabase from '/common/supabase';

export async function handleAuthCallback(url: string) {
    console.log('Handling auth callback:', url);

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
    const encryptedAccessToken = safeStorage.encryptString(accessToken);
    const encryptedRefreshToken = safeStorage.encryptString(refreshToken);

    // TODO: Store on disk
}

function storeUser(user: User) {
    const id = user.id;
    const email = user.email;
    const fullName = user.user_metadata.full_name;
    const avatarUrl = user.user_metadata.avatar_url;

    // TODO: Store on disk
}
