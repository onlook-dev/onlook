import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';

const program = new Command();

const rootDir = path.resolve(process.cwd(), '../..');
const clientEnvPath = path.join(rootDir, 'apps', 'web', 'client', '.env');
const seedEnvPath = path.join(rootDir, 'packages', 'seed', '.env');

program
    .name('setup-env')
    .description('Automate environment setup for Onlook development')
    .version('0.0.1')
    .action(async () => {
        console.log(chalk.bold.blue('🔑 Onlook Environment Setup Script'));
        console.log(chalk.bold.blue('=================================='));

        try {
            const dockerSpinner = ora('Checking if Docker is running...').start();
            const dockerProcess = spawn('docker', ['info'], { stdio: 'ignore' });

            const dockerCheck = await new Promise((resolve) => {
                dockerProcess.on('close', (code) => {
                    resolve(code === 0);
                });
            });

            if (!dockerCheck) {
                dockerSpinner.fail('Docker is not running. Please start Docker and try again.');
                process.exit(1);
            }
            dockerSpinner.succeed('Docker is running.');
        } catch (error) {
            console.error(chalk.red('Error checking Docker status:'), error);
            process.exit(1);
        }

        console.log(chalk.yellow('🚀 Starting Supabase backend...'));
        console.log(
            chalk.yellow("This might take a few minutes if it's your first time running Supabase."),
        );
        console.log(chalk.yellow('Please wait until the keys are displayed...'));

        const backendSpinner = ora('Waiting for Supabase to initialize...').start();

        const extractKeys = (
            output: string,
        ): { anonKey: string; serviceRoleKey: string } | null => {
            const anonKeyMatch = output.match(/anon key: (ey[A-Za-z0-9_-]+)/);
            const serviceRoleKeyMatch = output.match(/service_role key: (ey[A-Za-z0-9_-]+)/);

            if (anonKeyMatch?.[1] && serviceRoleKeyMatch?.[1]) {
                return {
                    anonKey: anonKeyMatch[1],
                    serviceRoleKey: serviceRoleKeyMatch[1],
                };
            }
            return null;
        };

        let keys: { anonKey: string; serviceRoleKey: string } | null = null;
        let stdoutBuffer = '';

        try {
            const backendProcess = spawn('bun', ['backend:start'], {
                cwd: rootDir,
                shell: true,
            });

            await new Promise<{ anonKey: string; serviceRoleKey: string }>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    backendProcess.kill();
                    backendSpinner.fail('Timed out waiting for Supabase keys.');
                    reject(new Error('Timed out waiting for Supabase keys'));
                }, 120000); // 2 minutes timeout

                backendProcess.stdout?.on('data', (data) => {
                    const chunk = data.toString();
                    stdoutBuffer += chunk;

                    const extractedKeys = extractKeys(stdoutBuffer);
                    if (extractedKeys) {
                        clearTimeout(timeout);
                        keys = extractedKeys;
                        backendProcess.kill();
                        backendSpinner.succeed('Successfully extracted Supabase keys.');
                        resolve(extractedKeys);
                    }
                });

                backendProcess.stderr?.on('data', (data) => {
                    const chunk = data.toString();
                    stdoutBuffer += chunk;

                    const extractedKeys = extractKeys(stdoutBuffer);
                    if (extractedKeys) {
                        clearTimeout(timeout);
                        keys = extractedKeys;
                        backendProcess.kill();
                        backendSpinner.succeed('Successfully extracted Supabase keys.');
                        resolve(extractedKeys);
                    }
                });

                backendProcess.on('error', (error) => {
                    clearTimeout(timeout);
                    backendSpinner.fail(`Error starting Supabase: ${error.message}`);
                    reject(error);
                });

                backendProcess.on('close', (code) => {
                    if (!keys) {
                        clearTimeout(timeout);
                        backendSpinner.fail('Failed to extract Supabase keys.');
                        console.error(
                            chalk.red(
                                "Please run 'bun backend:start' manually and check the output for the anon key and service role key.",
                            ),
                        );
                        reject(new Error('Failed to extract keys'));
                    }
                });
            });

            const apiKeysPrompt = await prompts([
                {
                    type: 'password',
                    name: 'csbApiKey',
                    message: 'Enter your Codesandbox API key (from https://codesandbox.io/api):',
                    validate: (value: string) => (value.length > 0 ? true : 'API key is required'),
                },
                {
                    type: 'password',
                    name: 'anthropicApiKey',
                    message:
                        'Enter your Anthropic API key (optional, from https://console.anthropic.com/settings/keys):',
                },
            ]);

            if (!apiKeysPrompt.csbApiKey) {
                console.error(chalk.red('Codesandbox API key is required.'));
                process.exit(1);
            }

            try {
                const clientEnvSpinner = ora(
                    `Creating .env file for web client at ${clientEnvPath}`,
                ).start();

                const clientEnvContent = `# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=${keys!.anonKey}

# Drizzle
SUPABASE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Codesandbox
CSB_API_KEY=${apiKeysPrompt.csbApiKey}

# Anthropic
ANTHROPIC_API_KEY=${apiKeysPrompt.anthropicApiKey || ''}
`;

                fs.writeFileSync(clientEnvPath, clientEnvContent);
                clientEnvSpinner.succeed(`Created .env file for web client at ${clientEnvPath}`);

                const seedEnvSpinner = ora(
                    `Creating .env file for seed package at ${seedEnvPath}`,
                ).start();

                const seedEnvContent = `SUPABASE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=${keys!.serviceRoleKey}
`;

                fs.writeFileSync(seedEnvPath, seedEnvContent);
                seedEnvSpinner.succeed(`Created .env file for seed package at ${seedEnvPath}`);

                console.log(chalk.green('✅ Environment files created successfully!'));
                console.log(
                    chalk.cyan('You can now proceed with the following steps from the guide:'),
                );
                console.log(chalk.cyan('6. Initialize the database: bun db:push'));
                console.log(chalk.cyan('7. Seed the database: bun seed'));
                console.log(chalk.cyan('8. Run development server: bun dev'));
            } catch (error) {
                console.error(chalk.red('Error creating .env files:'), error);
                process.exit(1);
            }
        } catch (error) {
            backendSpinner.fail(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    });

program.parse(process.argv);
