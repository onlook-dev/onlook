import chalk from 'chalk';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ora, { type Ora } from 'ora';
import { writeEnvFile } from './helpers';

/**
 * Finds the repository root directory by walking up from the current module's directory
 * looking for .git directory (preferred) or package.json with .git somewhere above it
 * @returns The absolute path to the repository root
 */
const findRepositoryRoot = (): string => {
    let currentDir = path.resolve(__dirname);
    const fsRoot = path.parse(currentDir).root;
    let firstPackageJsonDir: string | null = null;

    while (currentDir !== fsRoot) {
        const packageJsonPath = path.join(currentDir, 'package.json');
        const gitDirPath = path.join(currentDir, '.git');

        // Prioritize .git directory as the definitive repository root
        if (fs.existsSync(gitDirPath)) {
            return currentDir;
        }

        // Remember first package.json found as fallback
        if (fs.existsSync(packageJsonPath) && !firstPackageJsonDir) {
            firstPackageJsonDir = currentDir;
        }

        // Move up one directory
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            // Reached filesystem root without finding markers
            break;
        }
        currentDir = parentDir;
    }

    // If we found a .git directory, it would have been returned above
    // If we found a package.json, use that as repository root
    if (firstPackageJsonDir) {
        return firstPackageJsonDir;
    }

    // Final fallback: assume we're in packages/scripts and go up two levels
    const fallbackDir = path.resolve(__dirname, '..', '..');

    // Verify fallback has expected markers
    if (
        fs.existsSync(path.join(fallbackDir, 'package.json')) ||
        fs.existsSync(path.join(fallbackDir, '.git'))
    ) {
        return fallbackDir;
    }

    throw new Error(
        `Unable to find repository root. Searched from ${__dirname} up to ${fsRoot}. ` +
            `Expected to find .git directory or package.json file.`,
    );
};

// Determine root directory
const rootDir = findRepositoryRoot();

interface BackendKeys {
    anonKey: string;
    serviceRoleKey: string;
    publishableKey: string;
    secretKey: string;
}

export const promptAndWriteBackendKeys = async (clientEnvPath: string, dbEnvPath: string) => {
    await checkDockerRunning();
    const backendKeys = await startBackendAndExtractKeys();
    await writeEnvFile(clientEnvPath, getClientEnvContent(backendKeys), 'web client');
    await writeEnvFile(dbEnvPath, getDbEnvContent(backendKeys), 'db package');
};

interface BackendEnvConfig {
    key: string;
    value: string;
}

export const CLIENT_BACKEND_KEYS: BackendEnvConfig[] = [
    {
        key: 'NEXT_PUBLIC_SUPABASE_URL',
        value: 'http://127.0.0.1:54321',
    },
    {
        key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        value: '', // Will be filled with actual key
    },
    {
        key: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
        value: '', // Will be filled with actual key
    },
    {
        key: 'SUPABASE_SERVICE_ROLE_KEY',
        value: '', // Will be filled with actual key
    },
    {
        key: 'SUPABASE_DATABASE_URL',
        value: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    },
];

const DB_BACKEND_KEYS: BackendEnvConfig[] = [
    {
        key: 'SUPABASE_URL',
        value: 'http://127.0.0.1:54321',
    },
    {
        key: 'SUPABASE_SERVICE_ROLE_KEY',
        value: '', // Will be filled with actual key
    },
    {
        key: 'SUPABASE_SECRET_KEY',
        value: '', // Will be filled with actual key
    },
    {
        key: 'SUPABASE_DATABASE_URL',
        value: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    },
];

/**
 * Generates environment content from configuration
 * @param config - Array of environment variable configurations
 * @param keys - Backend keys to substitute
 * @returns Formatted environment content
 */
export const generateBackendEnvContent = (
    config: BackendEnvConfig[],
    keys: BackendKeys,
): string => {
    const lines: string[] = [];

    for (const item of config) {
        // Substitute actual keys where needed
        let value = item.value;
        if (item.key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
            value = keys.anonKey;
        } else if (item.key === 'SUPABASE_SERVICE_ROLE_KEY') {
            value = keys.serviceRoleKey;
        } else if (item.key === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') {
            value = keys.publishableKey;
        } else if (item.key === 'SUPABASE_SECRET_KEY') {
            value = keys.secretKey;
        }

        lines.push(`${item.key}=${value}`);
    }

    return lines.join('\n');
};

/**
 * Generates client environment configuration content
 * @param keys - Backend keys containing anon and service role keys
 * @returns Formatted environment content for client
 */
const getClientEnvContent = (keys: BackendKeys): string => {
    return generateBackendEnvContent(CLIENT_BACKEND_KEYS, keys);
};

/**
 * Generates database environment configuration content
 * @param keys - Backend keys containing anon and service role keys
 * @returns Formatted environment content for database
 */
export const getDbEnvContent = (keys: BackendKeys): string => {
    return generateBackendEnvContent(DB_BACKEND_KEYS, keys);
};

/**
 * Verifies that Docker is running on the system
 * @throws Exits process if Docker is not running
 */
const checkDockerRunning = async (): Promise<void> => {
    const spinner = ora('Checking if Docker is running...').start();
    try {
        const proc = spawn('docker', ['info'], { stdio: 'ignore' });
        const isRunning = await new Promise<boolean>((resolve) => {
            proc.once('close', (code) => resolve(code === 0));
            proc.once('error', () => resolve(false)); // e.g., ENOENT
        });
        if (!isRunning) {
            throw new Error('Docker is not running');
        }
        spinner.succeed('Docker is running.');
    } catch (err) {
        spinner.fail((err as Error).message);
        process.exit(1);
    }
};

/**
 * Extracts Supabase keys from supabase status -o env output
 * @param output - Raw output from supabase status command
 * @returns Extracted keys or null if not found
 */
const extractSupabaseKeys = (output: string): BackendKeys | null => {
    const anonMatch = output.match(/ANON_KEY="([^"]+)"/);
    const serviceRoleKeyMatch = output.match(/SERVICE_ROLE_KEY="([^"]+)"/);
    const publishableKeyMatch = output.match(/PUBLISHABLE_KEY="([^"]+)"/);
    const secretKeyMatch = output.match(/SECRET_KEY="([^"]+)"/);

    const anonKey = anonMatch?.[1];
    const serviceRoleKey = serviceRoleKeyMatch?.[1];
    const publishableKey = publishableKeyMatch?.[1];
    const secretKey = secretKeyMatch?.[1];

    return anonKey && serviceRoleKey && publishableKey && secretKey
        ? { anonKey, serviceRoleKey, publishableKey, secretKey }
        : null;
};

interface ProcessHandlers {
    onData: (data: Buffer) => void;
    onClose: () => void;
    onError: (err: Error) => void;
}

const createProcessHandlers = (
    proc: ReturnType<typeof spawn>,
    spinner: Ora,
    timeout: NodeJS.Timeout,
    resolve: (value: BackendKeys) => void,
    reject: (reason: Error) => void,
): ProcessHandlers => {
    let resolved = false;
    let buffer = '';

    const cleanup = () => {
        proc.stdout?.off('data', onData);
        proc.stderr?.off('data', onData);
        proc.off('close', onClose);
        proc.off('error', onError);
    };

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

    return { onData, onClose, onError };
};

const startBackendAndExtractKeys = async (): Promise<BackendKeys> => {
    console.log(chalk.yellow('🚀 Starting Supabase backend...'));
    const spinner = ora('Waiting for Supabase to initialize...').start();

    const startProc = spawn('bun run', ['backend:start'], { cwd: rootDir, shell: true });

    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            startProc.kill();
            spinner.fail('Timed out waiting for Supabase keys.');
            reject(new Error('Supabase start timeout'));
        }, 120_000);

        startProc.on('close', (code) => {
            clearTimeout(timeout);
            if (code === 0) {
                resolve();
            } else {
                spinner.fail('Failed to start Supabase backend.');
                reject(new Error('Supabase start failed'));
            }
        });

        startProc.on('error', (err) => {
            clearTimeout(timeout);
            spinner.fail(`Backend error: ${err.message}`);
            reject(err);
        });
    });

    spinner.succeed('Supabase backend started.');

    // Now get all keys from status
    const keysSpinner = ora('Extracting Supabase keys...').start();
    const statusProc = spawn('bun run', ['backend:status'], { cwd: rootDir, shell: true });

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            statusProc.kill();
            keysSpinner.fail('Timed out waiting for Supabase keys.');
            reject(new Error('Supabase status timeout'));
        }, 30_000);

        const { onData, onClose, onError } = createProcessHandlers(
            statusProc,
            keysSpinner,
            timeout,
            resolve,
            reject,
        );

        statusProc.stdout?.on('data', onData);
        statusProc.stderr?.on('data', onData);
        statusProc.on('close', onClose);
        statusProc.on('error', onError);
    });
};
