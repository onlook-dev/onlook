import fs from 'node:fs';
import path from 'node:path';
import ora from 'ora';
import prompts from 'prompts';
import chalk from 'chalk';

interface EnvVariable {
    key: string;
    value: string;
}

/**
 * Parses environment file content into a structured map
 * @param content - The raw .env file content
 * @returns Map of environment variables with their metadata
 */
export const parseEnvContent = (content: string): Map<string, EnvVariable> => {
    const envVars = new Map<string, EnvVariable>();
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (
            trimmedLine.includes('=') &&
            trimmedLine.indexOf('=') > 0 &&
            !trimmedLine.startsWith('#')
        ) {
            const [key, ...valueParts] = trimmedLine.split('=');
            const cleanKey = key?.trim();

            if (cleanKey) {
                const value = valueParts.join('=');
                envVars.set(cleanKey, {
                    key: cleanKey,
                    value,
                });
            }
        }
    }

    return envVars;
};

/**
 * Handles conflicts between existing and new environment variables
 * @param existingVars - Current environment variables
 * @param newVars - New environment variables to be added
 * @returns Resolved set of environment variables
 */
const resolveVariableConflicts = async (
    existingVars: Map<string, EnvVariable>,
    newVars: Map<string, EnvVariable>,
): Promise<Map<string, EnvVariable>> => {
    const resolvedVars = new Map(existingVars);

    for (const [key, newVar] of newVars) {
        if (existingVars.has(key)) {
            const userChoice = await promptForVariableAction(key);

            if (userChoice === 'replace') {
                resolvedVars.set(key, newVar);
                console.log(chalk.green(`✓ Replaced ${key} with new value\n`));
            } else {
                console.log(chalk.blue(`✓ Keeping existing value for ${key}\n`));
            }
        } else {
            resolvedVars.set(key, newVar);
            console.log(chalk.green(`✓ Added new variable: ${key}`));
        }
    }

    return resolvedVars;
};

/**
 * Prompts user for action when a variable conflict is detected
 * @param key - The conflicting environment variable key
 * @returns User's choice: 'replace' or 'skip'
 */
const promptForVariableAction = async (key: string): Promise<'replace' | 'skip'> => {
    process.stdout.write('\n');
    console.log(chalk.yellow(`⚠️  Variable ${chalk.bold(key)} already exists`));
    console.log('');

    const response = await prompts({
        type: 'select',
        name: 'action',
        message: `What would you like to do with ${key}?`,
        choices: [
            { title: 'Keep existing value', value: 'skip' },
            { title: 'Replace with new value', value: 'replace' },
        ],
        initial: 0,
    });

    return response.action || 'skip';
};

/**
 * Reconstructs environment file content from variable map
 * @param envVars - Map of environment variables
 * @returns Formatted .env file content
 */
export const buildEnvFileContent = (envVars: Map<string, EnvVariable>): string => {
    const lines: string[] = [];
    const envArray = Array.from(envVars.values());

    for (const envVar of envArray) {
        lines.push(`${envVar.key}=${envVar.value}`);
    }

    return lines.join('\n');
};

export const writeEnvFile = async (filePath: string, content: string, label: string) => {
    const spinner = ora(`Processing ${label} .env file`).start();

    try {
        let existingContent = '';
        let fileExists = false;

        // Check if file exists and read existing content
        if (fs.existsSync(filePath)) {
            fileExists = true;
            existingContent = fs.readFileSync(filePath, 'utf-8');
        }

        const existingVars = parseEnvContent(existingContent);
        const newVars = parseEnvContent(content);

        spinner.stop();

        // Give the terminal a moment to clear the spinner
        await new Promise((resolve) => setTimeout(resolve, 10));

        if (fileExists && existingVars.size > 0) {
            console.log(chalk.blue(`\n📄 Found existing .env file at ${filePath}`));

            const resolvedVars = await resolveVariableConflicts(existingVars, newVars);
            const finalContent = buildEnvFileContent(resolvedVars);

            const writeSpinner = ora(`Writing updated ${label} .env to ${filePath}`).start();
            try {
                // Ensure directory exists using cross-platform path handling
                const dir = path.dirname(filePath);
                await fs.promises.mkdir(dir, { recursive: true });

                // Write file with restrictive permissions (readable/writable only by owner)
                await fs.promises.writeFile(filePath, finalContent, { mode: 0o600 });
                writeSpinner.succeed(`${label} .env updated at ${filePath}`);
            } catch (error) {
                writeSpinner.fail(`Failed to update ${label} .env at ${filePath}`);
                throw error;
            }
        } else {
            const writeSpinner = ora(`Writing new ${label} .env to ${filePath}`).start();

            try {
                // Ensure directory exists using cross-platform path handling
                const dir = path.dirname(filePath);
                await fs.promises.mkdir(dir, { recursive: true });

                // Write file with restrictive permissions (readable/writable only by owner)
                await fs.promises.writeFile(filePath, content, { mode: 0o600 });
                writeSpinner.succeed(`${label} .env written to ${filePath}`);
            } catch (error) {
                writeSpinner.fail(`Failed to write ${label} .env to ${filePath}`);
                throw error;
            }
        }
    } catch (err) {
        spinner.fail(`Failed processing ${label} .env`);
        throw err;
    }
};
