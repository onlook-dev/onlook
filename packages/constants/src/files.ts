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

export const JSX_FILE_EXTENSIONS = ['jsx', 'tsx'];

export const JS_FILE_EXTENSIONS = ['js', 'ts'];

export const SUPPORTED_LOCK_FILES = [
    'bun.lock',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
];

export enum FILE_EXTENSION {
    JS = '.js',
    MJS = '.mjs',
    TS = '.ts',
}
