import chalk from 'chalk';
import fs from 'node:fs';
import prompts from 'prompts';

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
    OPENROUTER_API_KEY: {
        name: 'OPENROUTER_API_KEY',
        message: 'Enter your OpenRouter API key:',
        required: true,
        description: 'OpenRouter',
    },
};

const readExistingApiKeys = (clientEnvPath: string): Record<string, string> => {
    const existingKeys: Record<string, string> = {};

    if (fs.existsSync(clientEnvPath)) {
        try {
            const content = fs.readFileSync(clientEnvPath, 'utf-8');
            const lines = content.split('\n');

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.includes('=') && !trimmedLine.startsWith('#')) {
                    const [key, ...valueParts] = trimmedLine.split('=');
                    if (key && Object.keys(API_KEYS).includes(key)) {
                        existingKeys[key] = valueParts.join('=');
                    }
                }
            }
        } catch (err) {
            console.warn(chalk.yellow(`Warning: Could not read existing .env file: ${err}`));
        }
    }

    return existingKeys;
};

export const promptAndWriteApiKeys = async (clientEnvPath: string) => {
    const existingKeys = readExistingApiKeys(clientEnvPath);
    const responses = await promptForApiKeys(existingKeys);
    const envContent = generateEnvContent(responses);

    // Since we already handled existing key conflicts in promptForApiKeys,
    // we need to manually update the file to avoid duplicate prompting
    await writeApiKeysToFile(clientEnvPath, envContent);
};

const writeApiKeysToFile = async (filePath: string, newContent: string) => {
    try {
        let existingContent = '';
        if (fs.existsSync(filePath)) {
            existingContent = fs.readFileSync(filePath, 'utf-8');
        }

        // Parse existing content to remove old API keys
        const lines = existingContent.split('\n');
        const filteredLines: string[] = [];
        let skipNextLine = false;

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Skip API key comments and their associated keys
            if (
                trimmedLine.startsWith('#') &&
                Object.values(API_KEYS).some(
                    (key) => key.description && trimmedLine.includes(key.description),
                )
            ) {
                skipNextLine = true;
                continue;
            }

            // Skip API key lines
            if (
                trimmedLine.includes('=') &&
                Object.keys(API_KEYS).some((key) => trimmedLine.startsWith(`${key}=`))
            ) {
                skipNextLine = false;
                continue;
            }

            // Skip empty lines after API key comments
            if (skipNextLine && trimmedLine === '') {
                skipNextLine = false;
                continue;
            }

            filteredLines.push(line);
            skipNextLine = false;
        }

        // Ensure directory exists
        const dir = filePath.substring(0, filePath.lastIndexOf('/'));
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write the combined content
        const finalContent = filteredLines.join('\n') + '\n' + newContent;
        fs.writeFileSync(filePath, finalContent);

        console.log(chalk.green('✅ API keys updated successfully!'));
    } catch (err) {
        console.error(chalk.red('Failed to write API keys:'), err);
        throw err;
    }
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

const promptForApiKeys = async (existingKeys: Record<string, string>) => {
    const responses: Record<string, string> = {};

    console.log(chalk.blue('\n🔑 API Key Configuration'));
    console.log(chalk.gray('Configure your API keys for Onlook services\n'));

    for (const [keyName, config] of Object.entries(API_KEYS)) {
        const hasExisting = existingKeys[keyName];

        if (hasExisting) {
            console.log(
                chalk.yellow(`\n⚠️  ${config.description || keyName} API key already exists`),
            );

            const action = await prompts({
                type: 'select',
                name: 'choice',
                message: `What would you like to do with ${config.description || keyName}?`,
                choices: [
                    { title: 'Keep existing key', value: 'keep' },
                    { title: 'Replace with new key', value: 'replace' },
                    ...(config.required ? [] : [{ title: 'Remove key', value: 'remove' }]),
                ],
                initial: 0,
            });

            if (action.choice === 'keep') {
                responses[keyName] = hasExisting;
                console.log(chalk.green(`✓ Keeping existing ${config.description || keyName} key`));
                continue;
            } else if (action.choice === 'remove') {
                responses[keyName] = '';
                console.log(chalk.blue(`✓ Removed ${config.description || keyName} key`));
                continue;
            }
            // If 'replace' is selected, continue to prompt for new key
        }

        const response = await prompts({
            type: 'password',
            name: 'value',
            message: hasExisting
                ? `Enter new ${config.description || keyName} API key:`
                : config.message,
            validate: config.required
                ? (value: string) => value.length > 0 || `${keyName} is required`
                : undefined,
        });

        if (response.value !== undefined) {
            responses[keyName] = response.value;
            if (response.value) {
                console.log(
                    chalk.green(
                        `✓ ${hasExisting ? 'Updated' : 'Set'} ${config.description || keyName} key`,
                    ),
                );
            }
        } else {
            // User cancelled, keep existing if available
            if (hasExisting) {
                responses[keyName] = hasExisting;
            } else if (config.required) {
                console.error(chalk.red(`${keyName} API key is required.`));
                process.exit(1);
            }
        }
    }

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
