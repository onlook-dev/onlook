// WARNING: BE CAREFUL WHEN CHANGING THESE ROUTES, THEY ARE USED IN PRODUCTION
export const FUNCTIONS_ROUTE = '/functions/v1';
export const BASE_API_ROUTE = '/api';
export enum ApiRoutes {
    AI = '/ai',
    AI_V2 = '/ai-v2',
    ANALYTICS = '/analytics',
    HOSTING = '/hosting',
    HOSTING_V2 = '/hosting/v2',
    CUSTOM_DOMAINS = '/custom-domains',
    CREATE_CHECKOUT = '/create-checkout',
    CHECK_SUBSCRIPTION = '/check-subscription',
    CREATE_CUSTOMER_PORTAL_SESSION = '/create-customer-portal-session',
}

export const BASE_PROXY_ROUTE = '/proxy';
export enum ProxyRoutes {
    ANTHROPIC = '/anthropic',
}
export const REDIRECT_APP_URL = 'https://onlook.dev/redirect-app';
export const REQUEST_TYPE_HEADER = 'X-Onlook-Request-Type';

export enum HostingRoutes {
    CREATE_DOMAIN_VERIFICATION = '/create-domain-verification',
    VERIFY_DOMAIN = '/verify-domain',
    DEPLOY_WEB = '/deploy-web',
}
