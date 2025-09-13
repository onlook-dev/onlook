import nextPlugin from '@next/eslint-plugin-next';
import onlyWarn from 'eslint-plugin-only-warn';

/** @type {Awaited<import('typescript-eslint').Config>} */
export default [
    {
        files: ['**/*.ts', '**/*.tsx'],
        plugins: {
            '@next/next': nextPlugin,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            onlyWarn,
        },
        rules: {
            ...nextPlugin.configs.recommended.rules,
            ...nextPlugin.configs['core-web-vitals'].rules,
        },
    },
];
