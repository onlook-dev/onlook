export const BACKEND_URL =
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://api.onlook.dev';

export const API_ROUTES = {
    OPENAI: `${BACKEND_URL}/api/proxy/openai`,
    ANTHROPIC: `${BACKEND_URL}/api/proxy/anthropic`,
    FREESTYLE: `${BACKEND_URL}/api/proxy/freestyle/deploy`,
} as const;
