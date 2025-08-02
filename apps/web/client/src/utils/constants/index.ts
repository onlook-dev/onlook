export const Routes = {
    // Landing page
    HOME: '/',
    PRICING: '/pricing',
    FAQ: '/faq',
    ABOUT: '/about',
    CAREERS: '/careers',

    // Auth
    LOGIN: '/login',

    // Dashboard
    PROJECTS: '/projects',
    PROJECT: '/project',
    IMPORT_PROJECT: '/projects/import',

    // Callback
    CALLBACK_STRIPE_SUCCESS: '/callback/stripe/success',
    CALLBACK_STRIPE_CANCEL: '/callback/stripe/cancel',
} as const;

export const ExternalRoutes = {
    DOCS: 'https://docs.onlook.com',
    BLOG: 'https://onlook.substack.com',
    X: 'https://x.com/onlookdev',
    GITHUB: 'https://github.com/onlook-dev/onlook',
    CONTACT: 'mailto:contact@onlook.com',
    LINKEDIN: 'https://www.linkedin.com/company/onlook-dev/',
    YOUTUBE: 'https://www.youtube.com/@onlookdev',
    SUBSTACK: 'https://onlook.substack.com/',
    DISCORD: 'https://discord.gg/ZZzadNQtns',
};

export const Git = {
    MAX_COMMIT_MESSAGE_LENGTH: 72,
    MAX_COMMIT_MESSAGE_BODY_LENGTH: 500,
} as const;