import chalk from 'chalk';
import path from 'node:path';
import prompts from 'prompts';
import { rootDir } from '.';
import { writeEnvFile } from './helpers';

const clientEnvPath = path.join(rootDir, 'apps', 'web', 'client', '.env');

export const promptAndWriteApiKeys = async () => {
    const apiKeys = await promptForApiKeys();
    writeEnvFile(
        clientEnvPath,
        `# Codesandbox
CSB_API_KEY = ${apiKeys.csbApiKey}

# Anthropic
ANTHROPIC_API_KEY = ${apiKeys.anthropicApiKey || ''}

# MorphLLM
MORPH_API_KEY = ${apiKeys.morphApiKey}
`,
        'web client',
    );
};

export const promptForApiKeys = async () => {
    const responses = await prompts([
        {
            type: 'password',
            name: 'csbApiKey',
            message: 'Enter your Codesandbox API key:',
            validate: (v: string) => (v ? true : 'Required'),
        },
        {
            type: 'password',
            name: 'anthropicApiKey',
            message: 'Enter your Anthropic API key:',
            validate: (v: string) => (v ? true : 'Required'),
        },
        {
            type: 'password',
            name: 'morphApiKey',
            message: 'Enter your MorphLLM API key:',
            validate: (v: string) => (v ? true : 'Required'),
        },
    ]);

    if (!responses.csbApiKey) {
        console.error(chalk.red('Codesandbox API key is required.'));
        process.exit(1);
    }

    if (!responses.morphApiKey) {
        console.error(chalk.red('MorphLLM API key is required.'));
        process.exit(1);
    }

    return responses;
};
