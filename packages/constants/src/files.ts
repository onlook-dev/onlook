import { CUSTOM_OUTPUT_DIR } from './editor';

const BASE_EXCLUDED_DIRECTORIES = ['node_modules', 'dist', 'build', '.git', '.next'] as const;

export const EXCLUDED_SYNC_DIRECTORIES = [
    ...BASE_EXCLUDED_DIRECTORIES,
    'static',
    CUSTOM_OUTPUT_DIR,
];

export const IGNORED_UPLOAD_DIRECTORIES = [...BASE_EXCLUDED_DIRECTORIES, CUSTOM_OUTPUT_DIR];

export const EXCLUDED_PUBLISH_DIRECTORIES = [...BASE_EXCLUDED_DIRECTORIES, 'coverage'];

export const JSX_FILE_EXTENSIONS = ['.jsx', '.tsx'];

export const JS_FILE_EXTENSIONS = ['.js', '.ts', '.mjs', '.cjs'];

export const LAYOUT_FILE_LOCATION = ['src/app', 'app'];

export const LAYOUT_FILE_CONDITIONS = {
    fileName: 'layout',
    targetExtensions: JSX_FILE_EXTENSIONS,
    potentialPaths: LAYOUT_FILE_LOCATION,
};

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
