import chalk from 'chalk';
import prompts from 'prompts';
import { writeEnvFile } from './helpers';

interface ApiKeyConfig {
    name: string;
    message: string;
    required: boolean;
    description?: string;
}

const API_KEYS: Record<string, ApiKeyConfig> = {
    CSB_API_KEY: {
        name: 'CSB_API_KEY',
        message: 'Enter your Codesandbox API key:',
        required: true,
        description: 'Codesandbox',
    },
    ANTHROPIC_API_KEY: {
        name: 'ANTHROPIC_API_KEY',
        message: 'Enter your Anthropic API key:',
        required: true,
        description: 'Anthropic',
    },
    MORPH_API_KEY: {
        name: 'MORPH_API_KEY',
        message: 'Enter your MorphLLM API key (optional, leave blank if you are using Relace):',
        required: false,
        description: 'MorphLLM',
    },
    RELACE_API_KEY: {
        name: 'RELACE_API_KEY',
        message: 'Enter your Relace API key (optional, leave blank if you are using MorphLLM):',
        required: false,
        description: 'Relace',
    },
};

export const promptAndWriteApiKeys = async (clientEnvPath: string) => {
    const responses = await promptForApiKeys();
    const envContent = generateEnvContent(responses);
    writeEnvFile(clientEnvPath, envContent, 'web client');
};

const generateEnvContent = (responses: Record<string, string>): string => {
    return Object.entries(API_KEYS)
        .map(([key, config]) => {
            const value = responses[key] || '';
            return config.description
                ? `# ${config.description}\n${key}=${value}\n`
                : `${key}=${value}\n`;
        })
        .join('\n');
};

const promptForApiKeys = async () => {
    const responses = await prompts(
        Object.values(API_KEYS).map((api) => ({
            type: 'password',
            name: api.name,
            message: api.message,
            required: api.required,
        })),
    );

    validateResponses(responses);
    return responses;
};

const validateResponses = (responses: Record<string, string>) => {
    const missingKeys = Object.entries(API_KEYS)
        .filter(([key, config]) => config.required && !responses[key])
        .map(([key]) => key);

    if (missingKeys.length > 0) {
        missingKeys.forEach((key) => {
            console.error(chalk.red(`${key} API key is required.`));
        });
        process.exit(1);
    }
};
