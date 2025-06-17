import { CUSTOM_OUTPUT_DIR } from './editor';

export const IGNORED_DIRECTORIES = [
    'node_modules',
    'dist',
    'build',
    'public',
    'static',
    '.git',
    '.next',
    CUSTOM_OUTPUT_DIR,
];

export const IGNORED_UPLOAD_DIRECTORIES = [
    'node_modules',
    'dist',
    'build',
    '.git',
    '.next',
    CUSTOM_OUTPUT_DIR,
];

export const JSX_FILE_EXTENSIONS = ['.jsx', '.tsx'];

export const JS_FILE_EXTENSIONS = ['.js', '.ts', '.mjs', '.cjs'];

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

export const IGNORED_FILES = [
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
