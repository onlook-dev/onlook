import chalk from 'chalk';
import path from 'node:path';
import prompts from 'prompts';
import { rootDir } from '.';
import { writeEnvFile } from './helpers';

const clientEnvPath = path.join(rootDir, 'apps', 'web', 'client', '.env');

export const promptAndWriteApiKeys = async () => {
    const { apis, responses } = await promptForApiKeys();
    writeEnvFile(
        clientEnvPath,
        `# Codesandbox
${apis.CSB_API_KEY.name} = ${responses.CSB_API_KEY}

# Anthropic
${apis.ANTHROPIC_API_KEY.name} = ${responses.ANTHROPIC_API_KEY || ''}

# MorphLLM
${apis.MORPH_API_KEY.name} = ${responses.MORPH_API_KEY}
`,
        'web client',
    );
};

export const promptForApiKeys = async () => {
    const apis = {
        CSB_API_KEY: {
            name: 'CSB_API_KEY',
            message: 'Enter your Codesandbox API key:',
            required: true,
        },
        ANTHROPIC_API_KEY: {
            name: 'ANTHROPIC_API_KEY',
            message: 'Enter your Anthropic API key:',
            required: true,
        },
        MORPH_API_KEY: {
            name: 'MORPH_API_KEY',
            message: 'Enter your MorphLLM API key:',
            required: true,
        },
    };

    const responses = await prompts(
        Object.values(apis).map((api) => ({
            type: 'password',
            name: api.name,
            message: api.message,
            required: api.required,
        })),
    );

    for (const [key, value] of Object.entries(responses)) {
        if (!value) {
            console.error(chalk.red(`${key} API key is required.`));
            process.exit(1);
        }
    }
    return { apis, responses };
};
