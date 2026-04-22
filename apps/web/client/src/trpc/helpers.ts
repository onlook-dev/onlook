import { httpBatchStreamLink, loggerLink } from '@trpc/client';
import SuperJSON from 'superjson';

export function getBaseUrl() {
    if (typeof window !== 'undefined') return window.location.origin;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * 获取 IDE 浏览器场景下的 access token
 * 优先从 URL 参数获取，其次从 localStorage
 */
function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;

    // 从 URL 参数获取（Integrated Browser 场景）
    const urlToken = new URLSearchParams(window.location.search).get('accessToken');
    if (urlToken) {
        // 存储到 localStorage 以便后续请求使用
        localStorage.setItem('supabase-access-token', urlToken);
        return urlToken;
    }

    // 从 localStorage 获取（已存储的 token）
    return localStorage.getItem('supabase-access-token');
}

export const links = [
    loggerLink({
        enabled: (op) =>
            process.env.NODE_ENV === 'development' ||
            (op.direction === 'down' && op.result instanceof Error),
    }),
    httpBatchStreamLink({
        transformer: SuperJSON,
        url: getBaseUrl() + '/api/trpc',
        headers: () => {
            const headers = new Headers();
            headers.set('x-trpc-source', 'vanilla-client');

            // IDE 浏览器场景：添加 Authorization Header
            const token = getAccessToken();
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }

            return headers;
        },
    }),
];
