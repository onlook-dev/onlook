import chalk from 'chalk';
import { Command } from 'commander';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ora from 'ora';
import prompts from 'prompts';

const program = new Command();

// Determine root and .env paths
const cwd = process.cwd();
const isInPackagesScripts = cwd.includes('packages/scripts');
const rootDir = path.resolve(cwd, isInPackagesScripts ? '../..' : '.');
const clientEnvPath = path.join(rootDir, 'apps', 'web', 'client', '.env');
const dbEnvPath = path.join(rootDir, 'packages', 'db', '.env');

const checkDockerRunning = async () => {
    const spinner = ora('Checking if Docker is running...').start();
    try {
        const proc = spawn('docker', ['info'], { stdio: 'ignore' });
        const ok = await new Promise((res) => proc.on('close', (code) => res(code === 0)));
        if (!ok) throw new Error('Docker is not running');
        spinner.succeed('Docker is running.');
    } catch (err) {
        spinner.fail((err as Error).message);
        process.exit(1);
    }
};

const extractSupabaseKeys = (output: string) => {
    const anon = output.match(/anon key: (ey[A-Za-z0-9_-]+[^\r\n]*)/);
    const role = output.match(/service_role key: (ey[A-Za-z0-9_-]+[^\r\n]*)/);
    return anon?.[1] && role?.[1] ? { anonKey: anon[1], serviceRoleKey: role[1] } : null;
};

const startBackendAndExtractKeys = async (): Promise<{
    anonKey: string;
    serviceRoleKey: string;
}> => {
    console.log(chalk.yellow('🚀 Starting Supabase backend...'));
    const spinner = ora('Waiting for Supabase to initialize...').start();

    const proc = spawn('bun run', ['backend:start'], { cwd: rootDir, shell: true });

    return new Promise((resolve, reject) => {
        let resolved = false;
        let buffer = '';

        const cleanup = () => {
            proc.stdout?.off('data', onData);
            proc.stderr?.off('data', onData);
            proc.off('close', onClose);
            proc.off('error', onError);
        };

        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                proc.kill();
                spinner.fail('Timed out waiting for Supabase keys.');
                cleanup();
                reject(new Error('Supabase start timeout'));
            }
        }, 120_000);

        const onData = (data: Buffer) => {
            if (resolved) return;
            buffer += data.toString();
            const keys = extractSupabaseKeys(buffer);
            if (keys) {
                resolved = true;
                clearTimeout(timeout);
                proc.kill();
                cleanup();
                spinner.succeed('Successfully extracted Supabase keys.');
                resolve(keys);
            }
        };

        const onClose = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                cleanup();
                spinner.fail('Failed to extract Supabase keys.');
                reject(new Error('Supabase keys not found'));
            }
        };

        const onError = (err: Error) => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                cleanup();
                spinner.fail(`Backend error: ${err.message}`);
                reject(err);
            }
        };

        proc.stdout?.on('data', onData);
        proc.stderr?.on('data', onData);
        proc.on('close', onClose);
        proc.on('error', onError);
    });
};

const promptForApiKeys = async () => {
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
            message: 'Enter your Anthropic API key (optional):',
        },
    ]);

    if (!responses.csbApiKey) {
        console.error(chalk.red('Codesandbox API key is required.'));
        process.exit(1);
    }

    return responses;
};

const writeEnvFile = (filePath: string, content: string, label: string) => {
    const spinner = ora(`Writing ${label} .env to ${filePath}`).start();
    try {
        fs.writeFileSync(filePath, content);
        spinner.succeed(`${label} .env written to ${filePath}`);
    } catch (err) {
        spinner.fail(`Failed writing ${label} .env`);
        throw err;
    }
};

program
    .name('setup:env')
    .description('Automate environment setup for Onlook development')
    .version('0.0.1')
    .action(async () => {
        console.log(
            chalk.bold.blue(
                '🔑 Onlook Environment Setup Script\n==================================',
            ),
        );

        await checkDockerRunning();
        const keys = await startBackendAndExtractKeys();
        const apiKeys = await promptForApiKeys();

        try {
            writeEnvFile(
                clientEnvPath,
                `# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=${keys.anonKey}

# Drizzle
SUPABASE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Codesandbox
CSB_API_KEY=${apiKeys.csbApiKey}

# Anthropic
ANTHROPIC_API_KEY=${apiKeys.anthropicApiKey || ''}
`,
                'web client',
            );

            writeEnvFile(
                dbEnvPath,
                `SUPABASE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=${keys.serviceRoleKey}
`,
                'db package',
            );

            console.log(chalk.green('✅ Environment files created successfully!'));
            console.log(chalk.cyan('Next steps: https://docs.onlook.com'));
        } catch (err) {
            console.error(chalk.red('Error creating .env files:'), err);
            process.exit(1);
        }
    });

program.parse(process.argv);
