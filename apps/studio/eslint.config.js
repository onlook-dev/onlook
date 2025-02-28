import pluginJs from '@eslint/js';
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Import the custom plugin
const unsafeAccessorsPlugin = {
    plugins: {
        'unsafe-accessors': {
            rules: {
                'no-unsafe-nested-access': {
                    meta: {
                        type: 'problem',
                        docs: {
                            description:
                                'Disallow unsafe nested object access that can cause runtime crashes',
                            category: 'Possible Errors',
                            recommended: true,
                        },
                        fixable: 'code',
                        schema: [],
                    },
                    create(context) {
                        return {
                            MemberExpression(node) {
                                if (node.object && node.object.type === 'MemberExpression') {
                                    const sourceCode = context.getSourceCode();
                                    const text = sourceCode.getText(node);

                                    // Check for nested bracket notation without optional chaining
                                    if (
                                        text.includes('[') &&
                                        text.includes(']') &&
                                        !text.includes('?.')
                                    ) {
                                        context.report({
                                            node,
                                            message:
                                                'Unsafe nested object access can cause runtime crashes. Use optional chaining.',
                                            fix(fixer) {
                                                // Replace the unsafe access with optional chaining
                                                const fixed = text
                                                    .replace(/\[/g, '?.[')
                                                    .replace(/\]\./g, ']?.');
                                                return fixer.replaceText(node, fixed);
                                            },
                                        });
                                    }
                                }
                            },
                        };
                    },
                },
            },
        },
    },
};

export default [
    { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
    { languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
    { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    pluginReactConfig,
    unsafeAccessorsPlugin,
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
            '@typescript-eslint/no-unused-expressions': 'warn',
            '@typescript-eslint/ban-ts-comment': 'warn',
            // Add rules to error on unsafe accessors
            'no-unsafe-optional-chaining': 'error',
            'unsafe-accessors/no-unsafe-nested-access': 'error',
        },
    },
];
