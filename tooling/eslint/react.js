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
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            onlyWarn,
        },
        rules: {
            ...reactPlugin.configs['jsx-runtime'].rules,
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
