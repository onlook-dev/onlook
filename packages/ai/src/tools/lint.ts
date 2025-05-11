import { ESLint } from 'eslint';
import type { Linter } from 'eslint';
import path from 'path';
import fs from 'fs/promises';

type ESLintMessage = {
    ruleId: string | null;
    severity: 2 | 1 | 0;
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
    suggestions?: {
        desc: string;
        fix: {
            range: [number, number];
            text: string;
        };
    }[];
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
    errorsByRule: {
        [ruleId: string]: number;
    };
    warningsByRule: {
        [ruleId: string]: number;
    };
}

export class LintingService {
    private static instance: LintingService;
    private eslint: ESLint;

    private constructor(fix: boolean = true) {
        this.eslint = new ESLint({
            fix,
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

    public static getInstance(fix: boolean = true): LintingService {
        if (!LintingService.instance) {
            LintingService.instance = new LintingService(fix);
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
            console.error(`Failed to lint file: ${filePath}\n`, error);
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
        const errorsByRule: { [key: string]: number } = {};
        const warningsByRule: { [key: string]: number } = {};

        try {
            const files = await this.eslint.lintFiles([
                `${projectPath}/**/*.{ts,tsx,js,jsx}`,
                `!${projectPath}/node_modules/**`,
                `!${projectPath}/**/dist/**`,
                `!${projectPath}/**/build/**`,
                `!${projectPath}/**/.next/**`,
            ]);

            for (const result of files as unknown as ESLintResult[]) {
                const messages = result.messages;

                // Process each message
                messages.forEach((msg) => {
                    if (!msg.ruleId) return;

                    if (msg.severity === 2) {
                        totalErrors++;
                        errorsByRule[msg.ruleId] = (errorsByRule[msg.ruleId] || 0) + 1;
                    } else if (msg.severity === 1) {
                        totalWarnings++;
                        warningsByRule[msg.ruleId] = (warningsByRule[msg.ruleId] || 0) + 1;
                    }
                });

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
                errorsByRule,
                warningsByRule,
            };
        } catch (error) {
            console.error('Error during project linting:', error);
            throw new Error(
                `Failed to lint project: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }
}
