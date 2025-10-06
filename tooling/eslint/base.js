import * as path from 'node:path';
import { includeIgnoreFile } from '@eslint/compat';
import eslint from '@eslint/js';
import prettierConfigPlugin from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import * as jsoncPlugin from 'eslint-plugin-jsonc';
import onlyWarn from 'eslint-plugin-only-warn';
import prettierPlugin from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';

import prettierConfig from '@onlook/prettier';

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
    ...jsoncPlugin.configs['flat/recommended-with-json'],
    {
        files: ['**/*.json', '**/*.jsonc'],
        plugins: {
            prettier: prettierPlugin,
        },
        rules: {
            'prettier/prettier': ['warn', prettierConfig],
            // Disable some JSON rules that conflict with prettier
            'jsonc/comma-dangle': 'off',
            'jsonc/indent': 'off',
        },
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
            prettierConfigPlugin,
        ],
        rules: {
            'prettier/prettier': ['error', prettierConfig],
            '@typescript-eslint/array-type': 'off',
            '@typescript-eslint/consistent-type-definitions': 'off',
            '@typescript-eslint/consistent-type-imports': [
                'warn',
                { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
            ],
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/no-misused-promises': 'warn',
        },
    },
    {
        linterOptions: { reportUnusedDisableDirectives: true },
        languageOptions: { parserOptions: { projectService: true } },
    },
);
