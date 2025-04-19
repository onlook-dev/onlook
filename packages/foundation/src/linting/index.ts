import { ESLint } from 'eslint';
import type { Linter } from 'eslint';
import path from 'path';
import fs from 'fs/promises';

type ESLintMessage = {
    ruleId: string | null;
    severity: number;
    message: string;
    line: number;
    column: number;
    nodeType?: string;
    messageId?: string;
    endLine?: number;
    endColumn?: number;
    fix?: {
        range: [number, number];
        text: string;
    };
};

type ESLintResult = {
    filePath: string;
    messages: ESLintMessage[];
    fixed: boolean;
    output?: string;
};

export interface LintResult {
    filePath: string;
    messages: ESLintMessage[];
    fixed: boolean;
    output?: string;
}

export interface LintSummary {
    totalFiles: number;
    totalErrors: number;
    totalWarnings: number;
    fixedFiles: number;
    results: LintResult[];
}

export class LintingService {
    private static instance: LintingService;
    private eslint: ESLint;

    private constructor() {
        this.eslint = new ESLint({
            fix: true,
            baseConfig: {
                extends: [
                    'eslint:recommended',
                    'plugin:@typescript-eslint/recommended',
                    'plugin:react/recommended',
                    'plugin:react-hooks/recommended',
                ],
                parser: '@typescript-eslint/parser',
                parserOptions: {
                    ecmaFeatures: {
                        jsx: true,
                    },
                    ecmaVersion: 12,
                    sourceType: 'module',
                },
                plugins: ['@typescript-eslint', 'react', 'react-hooks'],
                rules: {
                    'react/react-in-jsx-scope': 'off',
                    'react/prop-types': 'off',
                    '@typescript-eslint/no-unused-vars': ['warn'],
                    '@typescript-eslint/no-explicit-any': 'off',
                    'no-console': 'warn',
                },
                settings: {
                    react: {
                        version: 'detect',
                    },
                },
            } as unknown as Linter.Config,
        });
    }

    public static getInstance(): LintingService {
        if (!LintingService.instance) {
            LintingService.instance = new LintingService();
        }
        return LintingService.instance;
    }

    public async lintAndFix(filePath: string, content: string): Promise<LintResult> {
        const tempPath = path.join(
            path.dirname(filePath),
            `.temp.${Date.now()}.${path.basename(filePath)}`,
        );
        try {
            await fs.writeFile(tempPath, content);

            const results = await this.eslint.lintFiles([tempPath]);
            if (!results.length) {
                throw new Error('No lint result returned');
            }

            const result = results[0] as unknown as ESLintResult;

            let fixedContent = content;
            if (result.output) {
                fixedContent = result.output;
                await fs.writeFile(tempPath, fixedContent);
            }

            return {
                filePath,
                messages: result.messages,
                fixed: result.fixed,
                output: fixedContent,
            };
        } catch (error) {
            console.error('Linting error:', error);
            return {
                filePath,
                messages: [],
                fixed: false,
                output: content,
            };
        } finally {
            await fs.unlink(tempPath).catch(() => {});
        }
    }

    public async lintProject(projectPath: string): Promise<LintSummary> {
        const results: LintResult[] = [];
        let totalErrors = 0;
        let totalWarnings = 0;
        let fixedFiles = 0;

        const files = await this.eslint.lintFiles([
            `${projectPath}/**/*.{ts,tsx,js,jsx}`,
            `!${projectPath}/node_modules/**`,
        ]);
        const typedFiles = files as unknown as ESLintResult[];

        for (const result of typedFiles) {
            const messages = result.messages;
            const hasErrors = messages.some((m) => m.severity === 2);
            const hasWarnings = messages.some((m) => m.severity === 1);

            if (hasErrors) totalErrors += messages.filter((m) => m.severity === 2).length;
            if (hasWarnings) totalWarnings += messages.filter((m) => m.severity === 1).length;
            if (result.fixed) fixedFiles++;

            results.push({
                filePath: result.filePath,
                messages,
                fixed: result.fixed,
                output: result.output,
            });
        }

        return {
            totalFiles: files.length,
            totalErrors,
            totalWarnings,
            fixedFiles,
            results,
        };
    }
}
