import * as path from 'node:path';
import { includeIgnoreFile } from '@eslint/compat';
import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import onlyWarn from 'eslint-plugin-only-warn';
import prettierPlugin from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';

import prettierConfig from '@onlook/prettier';

/**
 * All packages that leverage t3-env should use this rule
 */
export const restrictEnvAccess = tseslint.config(
    { ignores: ['**/env.ts'] },
    {
        files: ['**/*.js', '**/*.ts', '**/*.tsx'],
        rules: {
            'no-restricted-properties': [
                'error',
                {
                    object: 'process',
                    property: 'env',
                    message: "Use `import { env } from '@/env'` instead to ensure validated types.",
                },
            ],
            'no-restricted-imports': [
                'error',
                {
                    name: 'process',
                    importNames: ['env'],
                    message: "Use `import { env } from '@/env'` instead to ensure validated types.",
                },
            ],
        },
    },
);

export default tseslint.config(
    includeIgnoreFile(path.join(import.meta.dirname, '../../.gitignore')),
    {
        ignores: [
            '**/*.config.js',
            '**/*.config.mjs',
            '**/*.config.cjs',
            '**/dist/**',
            '**/build/**',
            '**/.next/**',
        ],
    },
    {
        files: ['**/*.js', '**/*.ts', '**/*.tsx'],
        plugins: {
            import: importPlugin,
            prettier: prettierPlugin,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            onlyWarn,
        },
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.recommended,
            ...tseslint.configs.recommendedTypeChecked,
            ...tseslint.configs.stylisticTypeChecked,
        ],
        rules: {
            'prettier/prettier': ['error', prettierConfig],
            '@typescript-eslint/array-type': 'off',
            '@typescript-eslint/consistent-type-definitions': 'off',
            '@typescript-eslint/consistent-type-imports': [
                'warn',
                { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
            ],
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/no-misused-promises': 'warn',
            'import/consistent-type-specifier-style': ['error', 'prefer-inline'],
        },
    },
    {
        linterOptions: { reportUnusedDisableDirectives: true },
        languageOptions: { parserOptions: { projectService: true } },
    },
);
