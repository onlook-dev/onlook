import chalk from 'chalk';
import { spawn } from 'node:child_process';
import path from 'node:path';
import ora from 'ora';
import { rootDir } from '.';
import { writeEnvFile } from './helpers';

const dbEnvPath = path.join(rootDir, 'packages', 'db', '.env');

export const promptAndWriteBackendKeys = async () => {
    await checkDockerRunning();
    const backendKeys = await startBackendAndExtractKeys();
    writeEnvFile(
        dbEnvPath,
        `# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=${backendKeys.anonKey}

# Drizzle
SUPABASE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
`,
        'db package',
    );
};

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
