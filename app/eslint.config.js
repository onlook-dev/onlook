import { fixupConfigRules } from '@eslint/compat';
import pluginJs from '@eslint/js';
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
    { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
    { languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
    { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    ...fixupConfigRules(pluginReactConfig),
    {
        ignores: [
            'node_modules/',
            'dist/',
            'dist-electron/',
            'release/',
            'src/out/',
            'electron/preload/webview/bundles/csstree.esm.js',
            'electron/preload/webview/bundles/uuid.js',
        ],
    },
    {
        rules: {
            curly: ['error', 'all'],
            'prefer-const': 'warn',
            'react/react-in-jsx-scope': 'off',
            'react/jsx-uses-react': 'off',
            'react/no-unknown-property': 'off',
            'react/prop-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'warn',
        },
    },
];
