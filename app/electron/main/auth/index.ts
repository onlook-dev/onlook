import { User } from '@supabase/supabase-js';
import supabase from './supabase';
import { APP_SCHEMA } from '/common/constants';

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
    // TODO: Store securely
}

function storeUser(user: User) {
    // TODO: Store user info
    console.log('user', user);
}
