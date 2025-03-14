import { APP_SCHEMA, MainChannels } from '@onlook/models/constants';
import type { AuthTokens, UserMetadata } from '@onlook/models/settings';
import supabase from '@onlook/supabase/clients';
import type { AuthResponse, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { shell } from 'electron';
import { mainWindow } from '..';
import analytics, { sendAnalytics } from '../analytics';
import { PersistentStorage } from '../storage';

let isAutoRefreshEnabled = false;
let isListeningForSessionChanges = false;

export async function startAuthAutoRefresh() {
    if (!supabase || isAutoRefreshEnabled) {
        return;
    }

    try {
        await supabase.auth.startAutoRefresh();
        isAutoRefreshEnabled = true;
        console.log('Started auto-refresh for auth session');
    } catch (error) {
        console.error('Failed to start auto-refresh:', error);
    }
}

export async function stopAuthAutoRefresh() {
    if (!supabase || !isAutoRefreshEnabled) {
        return;
    }

    try {
        await supabase.auth.stopAutoRefresh();
        isAutoRefreshEnabled = false;
        console.log('Stopped auto-refresh for auth session');
    } catch (error) {
        console.error('Failed to stop auto-refresh:', error);
    }
}

export function setupAuthAutoRefresh() {
    if (!mainWindow) {
        return;
    }

    cleanupAuthAutoRefresh();
    mainWindow.on('focus', startAuthAutoRefresh);
    mainWindow.on('blur', stopAuthAutoRefresh);

    if (mainWindow.isFocused()) {
        startAuthAutoRefresh();
    }
}

export function cleanupAuthAutoRefresh() {
    if (!mainWindow) {
        return;
    }

    mainWindow.removeListener('focus', startAuthAutoRefresh);
    mainWindow.removeListener('blur', stopAuthAutoRefresh);
    stopAuthAutoRefresh();
}

export async function signIn(provider: 'github' | 'google') {
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

    shell.openExternal(data.url);
    sendAnalytics('sign in', { provider });
}

export async function handleAuthCallback(url: string) {
    if (!url.startsWith(APP_SCHEMA + '://auth')) {
        return;
    }

    const authTokens = getTokenFromCallbackUrl(url);
    PersistentStorage.AUTH_TOKENS.replace(authTokens);

    if (!supabase) {
        throw new Error('No backend connected');
    }

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
    emitSignInEvent();
    listenForSessionChanges(supabase);
}

function emitSignInEvent() {
    mainWindow?.webContents.send(MainChannels.USER_SIGNED_IN);
}

function getTokenFromCallbackUrl(url: string): AuthTokens {
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

    const {
        data: { session: currentSession },
    } = await supabase.auth.getSession();
    if (currentSession) {
        return getAuthTokensFromSession(currentSession);
    }

    const authTokens = PersistentStorage.AUTH_TOKENS.read();
    if (!authTokens) {
        throw new Error('No auth tokens found');
    }

    const {
        data: { session: refreshedSession },
        error,
    }: AuthResponse = await supabase.auth.setSession({
        access_token: authTokens.accessToken,
        refresh_token: authTokens.refreshToken,
    });

    if (error || !refreshedSession) {
        throw new Error('Failed to refresh session, you may need to sign in again. ' + error);
    }

    const refreshedAuthTokens = getAuthTokensFromSession(refreshedSession);

    // Save the refreshed auth tokens to the persistent storage
    PersistentStorage.AUTH_TOKENS.replace(refreshedAuthTokens);
    return refreshedAuthTokens;
}

function getAuthTokensFromSession(session: Session): AuthTokens {
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

function listenForSessionChanges(supabase: SupabaseClient) {
    if (isListeningForSessionChanges) {
        return;
    }
    isListeningForSessionChanges = true;

    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            const authTokens = getAuthTokensFromSession(session);
            PersistentStorage.AUTH_TOKENS.replace(authTokens);
        }
    });
}

export async function signOut() {
    sendAnalytics('sign out');
    analytics.signOut();

    await supabase?.auth.signOut();
    PersistentStorage.USER_METADATA.clear();
    PersistentStorage.AUTH_TOKENS.clear();
    mainWindow?.webContents.send(MainChannels.USER_SIGNED_OUT);
}
