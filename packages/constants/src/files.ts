const isDev = process.env.NODE_ENV === 'development';
const BASE_EXCLUDED_DIRECTORIES = ['node_modules', 'dist', 'build', '.git', '.next'] as const;

export const CUSTOM_OUTPUT_DIR = '.next-prod';
export const ONLOOK_CACHE_DIRECTORY = '.onlook';

// Preload script. Fetch from local public folder in dev, fetch from CDN in prod.
export const ONLOOK_PRELOAD_SCRIPT_FILE = 'onlook-preload-script.js';
// Fetch path to load from local
export const ONLOOK_DEV_PRELOAD_SCRIPT_SRC = `/${ONLOOK_PRELOAD_SCRIPT_FILE}`;
// Path to write into sandbox
export const ONLOOK_DEV_PRELOAD_SCRIPT_PATH = `public/${ONLOOK_PRELOAD_SCRIPT_FILE}`;
// Fetch url to load from CDN
const ONLOOK_PROD_PRELOAD_SCRIPT_SRC =
    'https://cdn.jsdelivr.net/gh/onlook-dev/onlook@d3887f2/apps/web/client/public/onlook-preload-script.js';
// Officially exported src to load from local or CDN
export const ONLOOK_PRELOAD_SCRIPT_SRC = isDev ? ONLOOK_DEV_PRELOAD_SCRIPT_SRC : ONLOOK_PROD_PRELOAD_SCRIPT_SRC;

export const DEPRECATED_PRELOAD_SCRIPT_SRCS = [
    'https://cdn.jsdelivr.net/gh/onlook-dev/onlook@main/apps/web/client/public/onlook-preload-script.js',
    // Intentionally reversed to deprecate non-preferred (local in prod, CDN in dev) usage.
    isDev ? ONLOOK_PROD_PRELOAD_SCRIPT_SRC : ONLOOK_DEV_PRELOAD_SCRIPT_SRC,
];

export const DEFAULT_IMAGE_DIRECTORY = 'public';

export const EXCLUDED_SYNC_PATHS = [
    ...BASE_EXCLUDED_DIRECTORIES,
    'static',
    'out',
    CUSTOM_OUTPUT_DIR,
    ONLOOK_CACHE_DIRECTORY,
    ONLOOK_DEV_PRELOAD_SCRIPT_PATH,
];

export const IGNORED_UPLOAD_DIRECTORIES = [...BASE_EXCLUDED_DIRECTORIES, CUSTOM_OUTPUT_DIR];

export const EXCLUDED_PUBLISH_DIRECTORIES = [...BASE_EXCLUDED_DIRECTORIES, 'coverage'];

const JSX_FILE_EXTENSIONS = ['.jsx', '.tsx'];

export const JS_FILE_EXTENSIONS = ['.js', '.ts', '.mjs', '.cjs'];

// Nextjs allow jsx in js and ts files so we need to support both
export const NEXT_JS_FILE_EXTENSIONS = [...JSX_FILE_EXTENSIONS, ...JS_FILE_EXTENSIONS];

export const SUPPORTED_LOCK_FILES = [
    'bun.lock',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
];

export const BINARY_EXTENSIONS = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.svg',
    '.ico',
    '.webp',
    '.pdf',
    '.zip',
    '.tar',
    '.gz',
    '.rar',
    '.7z',
    '.mp3',
    '.mp4',
    '.wav',
    '.avi',
    '.mov',
    '.wmv',
    '.exe',
    '.bin',
    '.dll',
    '.so',
    '.dylib',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.otf',
];

export const IGNORED_UPLOAD_FILES = [
    '.DS_Store',
    'Thumbs.db',
    'yarn.lock',
    'package-lock.json',
    'pnpm-lock.yaml',
    'bun.lockb',
    '.env.local',
    '.env.development.local',
    '.env.production.local',
    '.env.test.local',
];

export const IMAGE_EXTENSIONS = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/ico',
    'image/x-icon',
    'image/avif',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
];

/**
 * Compression presets for common use cases
 */
export const COMPRESSION_IMAGE_PRESETS = {
    web: {
        quality: 80,
        format: 'webp' as const,
        progressive: true,
        effort: 4,
    },
    thumbnail: {
        quality: 70,
        width: 300,
        height: 300,
        format: 'webp' as const,
        keepAspectRatio: true,
    },
    highQuality: {
        quality: 95,
        format: 'jpeg' as const,
        progressive: true,
        mozjpeg: true,
    },
    lowFileSize: {
        quality: 60,
        format: 'webp' as const,
        effort: 6,
    },
} as const;
