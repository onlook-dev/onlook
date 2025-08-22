import fs from 'node:fs';
import ora from 'ora';
import prompts from 'prompts';
import chalk from 'chalk';

interface EnvVariable {
    key: string;
    value: string;
    comment?: string;
}

const parseEnvFile = (content: string): Map<string, EnvVariable> => {
    const envVars = new Map<string, EnvVariable>();
    const lines = content.split('\n');
    let currentComment: string | undefined;

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('#')) {
            currentComment = trimmedLine;
        } else if (trimmedLine.includes('=')) {
            const [key, ...valueParts] = trimmedLine.split('=');
            if (key) {
                const value = valueParts.join('=');
                envVars.set(key, {
                    key,
                    value,
                    ...(currentComment && { comment: currentComment }),
                });
            }
            currentComment = undefined;
        } else if (trimmedLine === '') {
            currentComment = undefined;
        }
    }

    return envVars;
};

const parseNewContent = (content: string): Map<string, EnvVariable> => {
    const envVars = new Map<string, EnvVariable>();
    const lines = content.split('\n');
    let currentComment: string | undefined;

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('#')) {
            currentComment = trimmedLine;
        } else if (trimmedLine.includes('=')) {
            const [key, ...valueParts] = trimmedLine.split('=');
            if (key) {
                const value = valueParts.join('=');
                envVars.set(key, {
                    key,
                    value,
                    ...(currentComment && { comment: currentComment }),
                });
            }
            currentComment = undefined;
        }
    }

    return envVars;
};

const checkForExistingKeys = async (
    existingVars: Map<string, EnvVariable>,
    newVars: Map<string, EnvVariable>,
): Promise<Map<string, EnvVariable>> => {
    const finalVars = new Map(existingVars);

    // Process each new variable
    for (const [key, newVar] of newVars) {
        if (existingVars.has(key)) {
            const existing = existingVars.get(key)!;

            // Clear any remaining terminal artifacts
            process.stdout.write('\n');
            console.log(chalk.yellow(`⚠️  Variable ${chalk.bold(key)} already exists`));
            console.log(''); // Add spacing before prompt

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

            if (response.action === 'replace') {
                finalVars.set(key, newVar);
                console.log(chalk.green(`\n✓ Replaced ${key} with new value\n`));
            } else {
                console.log(chalk.blue(`\n✓ Keeping existing value for ${key}\n`));
            }
        } else {
            // Add new variables that don't exist
            finalVars.set(key, newVar);
            console.log(chalk.green(`✓ Added new variable: ${key}`));
        }
    }

    return finalVars;
};

const reconstructEnvContent = (envVars: Map<string, EnvVariable>): string => {
    const lines: string[] = [];

    for (const envVar of envVars.values()) {
        if (envVar.comment) {
            lines.push(envVar.comment);
        }
        lines.push(`${envVar.key}=${envVar.value}`);
        lines.push('');
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

        const existingVars = parseEnvFile(existingContent);
        const newVars = parseNewContent(content);

        spinner.stop();

        // Give the terminal a moment to clear the spinner
        await new Promise((resolve) => setTimeout(resolve, 10));

        if (fileExists && existingVars.size > 0) {
            console.log(chalk.blue(`\n📄 Found existing .env file at ${filePath}`));

            const finalVars = await checkForExistingKeys(existingVars, newVars);
            const finalContent = reconstructEnvContent(finalVars);

            const writeSpinner = ora(`Writing updated ${label} .env to ${filePath}`).start();
            fs.writeFileSync(filePath, finalContent);
            writeSpinner.succeed(`${label} .env updated at ${filePath}`);
        } else {
            const writeSpinner = ora(`Writing new ${label} .env to ${filePath}`).start();

            // Ensure directory exists
            const dir = filePath.substring(0, filePath.lastIndexOf('/'));
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(filePath, content);
            writeSpinner.succeed(`${label} .env written to ${filePath}`);
        }
    } catch (err) {
        spinner.fail(`Failed processing ${label} .env`);
        throw err;
    }
};
