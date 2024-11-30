export enum BUILD_TOOL_NAME {
    NEXT = 'next',
    WEBPACK = 'webpack',
    CRA = 'cra',
    VITE = 'vite',
}

export enum DEPENDENCY_NAME {
    NEXT = 'next',
    WEBPACK = 'webpack',
    CRA = 'react-scripts',
    VITE = 'vite',
}

export enum CONFIG_BASE_NAME {
    NEXTJS = 'next.config',
    WEBPACK = 'webpack.config',
    VITEJS = 'vite.config',
}

export const CONFIG_FILE_PATTERN: Record<BUILD_TOOL_NAME, string> = {
    [BUILD_TOOL_NAME.NEXT]: `${CONFIG_BASE_NAME.NEXTJS}.*`,
    [BUILD_TOOL_NAME.WEBPACK]: `${CONFIG_BASE_NAME.WEBPACK}.*`,
    [BUILD_TOOL_NAME.VITE]: `${CONFIG_BASE_NAME.VITEJS}.*`,
    [BUILD_TOOL_NAME.CRA]: '',
};

export const PACKAGE_JSON = 'package.json';

export enum LOCK_FILE_NAME {
    YARN = 'yarn.lock',
    BUN = 'bun.lockb',
    PNPM = 'pnpm-lock.yaml',
}

export enum PACKAGE_MANAGER {
    YARN = 'yarn',
    NPM = 'npm',
    PNPM = 'pnpm',
    BUN = 'bun',
}

export enum ONLOOK_PLUGIN {
    NEXTJS = '@onlook/nextjs',
    WEBPACK = '@onlook/react',
    BABEL = '@onlook/babel-plugin-react',
}

export const NEXTJS_COMMON_FILES = ['pages', 'app', 'src/pages', 'src/app'];
export const CRA_COMMON_FILES = ['public', 'src'];

export const CONFIG_OVERRIDES_FILE = 'config-overrides.js';
export const BABELRC_FILE = '.babelrc';

export enum FILE_EXTENSION {
    JS = '.js',
    MJS = '.mjs',
    TS = '.ts',
}

export const NEXT_DEPENDENCIES = [ONLOOK_PLUGIN.NEXTJS];
export const CRA_DEPENDENCIES = [ONLOOK_PLUGIN.BABEL, 'customize-cra', 'react-app-rewired'];
export const VITE_DEPENDENCIES = [ONLOOK_PLUGIN.BABEL];

export const WEBPACK_DEPENDENCIES = [
    ONLOOK_PLUGIN.BABEL,
    'babel-loader',
    '@babel/preset-react',
    '@babel/core',
    '@babel/preset-env',
    'webpack',
];
