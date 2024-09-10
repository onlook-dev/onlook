import supabase from './supabase';
import { APP_SCHEMA } from '/common/constants';

export async function handleAuthCallback(url: string) {
    console.log('url', url);
    if (!url.startsWith(APP_SCHEMA + '://auth')) {
        return;
    }

    const fragmentParams = new URLSearchParams(url.split('#')[1]);
    const accessToken = fragmentParams.get('access_token');
    const refreshToken = fragmentParams.get('refresh_token');

    if (!accessToken) {
        throw new Error('No access token found in the URL');
    }

    // Set the session in Supabase client
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
    console.log('user', user);
}
