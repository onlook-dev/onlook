import queryPlugin from '@tanstack/eslint-plugin-query';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import onlyWarn from 'eslint-plugin-only-warn';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';

/** @type {Awaited<import('typescript-eslint').Config>} */
export default [
    {
        files: ['**/*.ts', '**/*.tsx'],
        plugins: {
            react: reactPlugin,
            'react-hooks': hooksPlugin,
            'jsx-a11y': jsxA11yPlugin,
            '@tanstack/query': queryPlugin,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            onlyWarn,
        },
        rules: {
            ...reactPlugin.configs['jsx-runtime'].rules,
            ...jsxA11yPlugin.configs.recommended.rules,
            ...queryPlugin.configs.recommended.rules,
            'react-hooks/exhaustive-deps': 'warn',
            'react-hooks/rules-of-hooks': 'error',
            'react/prop-types': 'off',
        },
        languageOptions: {
            globals: {
                React: 'writable',
            },
        },
    },
];
