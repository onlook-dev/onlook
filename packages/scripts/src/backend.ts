import chalk from 'chalk';
import { spawn } from 'node:child_process';
import type { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import ora, { type Ora } from 'ora';
import { z } from 'zod';
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

const SupabaseStatusSchema = z
    .object({
        ANON_KEY: z.string(),
        API_URL: z.string(),
        DB_URL: z.string(),
        GRAPHQL_URL: z.string(),
        INBUCKET_URL: z.string(),
        JWT_SECRET: z.string(),
        MAILPIT_URL: z.string(),
        PUBLISHABLE_KEY: z.string(),
        S3_PROTOCOL_ACCESS_KEY_ID: z.string(),
        S3_PROTOCOL_ACCESS_KEY_SECRET: z.string(),
        S3_PROTOCOL_REGION: z.string(),
        SECRET_KEY: z.string(),
        SERVICE_ROLE_KEY: z.string(),
        STORAGE_S3_URL: z.string(),
        STUDIO_URL: z.string(),
    })
    .transform((raw) => ({
        anonKey: raw.ANON_KEY,
        apiUrl: raw.API_URL,
        dbUrl: raw.DB_URL,
        graphqlUrl: raw.GRAPHQL_URL,
        inbucketUrl: raw.INBUCKET_URL,
        jwtSecret: raw.JWT_SECRET,
        mailpitUrl: raw.MAILPIT_URL,
        publishableKey: raw.PUBLISHABLE_KEY,
        s3ProtocolAccessKeyId: raw.S3_PROTOCOL_ACCESS_KEY_ID,
        s3ProtocolAccessKeySecret: raw.S3_PROTOCOL_ACCESS_KEY_SECRET,
        s3ProtocolRegion: raw.S3_PROTOCOL_REGION,
        secretKey: raw.SECRET_KEY,
        serviceRoleKey: raw.SERVICE_ROLE_KEY,
        storageS3Url: raw.STORAGE_S3_URL,
        studioUrl: raw.STUDIO_URL,
    }));

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
 * Extracts Supabase keys from supabase status -o json output
 * @param output - Raw JSON output from supabase status command
 * @returns Extracted keys or null if not found
 */
const extractSupabaseKeys = (output: string): BackendKeys | null => {
    try {
        const parsed: unknown = JSON.parse(output);
        const validationResult = SupabaseStatusSchema.safeParse(parsed);

        if (!validationResult.success) {
            console.error('Supabase status validation failed:', validationResult.error.issues);
            return null;
        }

        const status = validationResult.data;
        const anonKey = status.anonKey;
        const serviceRoleKey = status.serviceRoleKey;
        const publishableKey = status.publishableKey;
        const secretKey = status.secretKey;

        if (!anonKey || !serviceRoleKey) {
            console.warn('Missing required Supabase keys in status output');
            return null;
        }

        return { anonKey, serviceRoleKey, publishableKey, secretKey };
    } catch (error) {
        console.error('Failed to parse Supabase status JSON:', error);
        return null;
    }
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

        try {
            const keys = extractSupabaseKeys(buffer);
            if (keys) {
                resolved = true;
                clearTimeout(timeout);
                proc.kill();
                cleanup();
                spinner.succeed('Successfully extracted Supabase keys.');
                resolve(keys);
            }
        } catch {
            // JSON might be incomplete, continue buffering
            console.debug('Incomplete JSON received, continuing to buffer...');
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

const BACKEND_START_INACTIVITY_TIMEOUT_MS = 300_000;
const OUTPUT_TAIL_LIMIT = 2_000;
const PROGRESS_LINE_LIMIT = 100;
const PROGRESS_CARRY_LIMIT = 4_000;

export interface MonitoredProcess {
    stdout: EventEmitter | null;
    stderr: EventEmitter | null;
    on(event: 'close', listener: (code: number | null) => void): unknown;
    on(event: 'error', listener: (err: Error) => void): unknown;
    kill(): unknown;
}

export interface BackendStartOptions {
    inactivityTimeoutMs: number;
    onOutput?: (chunk: string) => void;
}

const REDACTED = '[redacted]';

const SENSITIVE_LABEL_PATTERN =
    /\b((?:jwt|anon|service[_ ]role|publishable|secret|access|s3)[a-z_ ]*(?:key|secret|token|password)[a-z_ ]*)(\s*[:=]\s*)(\S+)/gi;

const SENSITIVE_TOKEN_PATTERNS: RegExp[] = [
    /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/g,
    /\bsb_[a-z]+_[A-Za-z0-9_-]{8,}/g,
];

const redactSensitiveOutput = (text: string): string => {
    const withoutLabelledValues = text.replace(
        SENSITIVE_LABEL_PATTERN,
        (_match, label: string, separator: string) => `${label}${separator}${REDACTED}`,
    );

    return SENSITIVE_TOKEN_PATTERNS.reduce(
        (redacted, pattern) => redacted.replace(pattern, REDACTED),
        withoutLabelledValues,
    );
};

const lastNonEmptyLine = (chunk: string): string | undefined =>
    chunk
        .split(/[\r\n]+/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .pop();

/**
 * Builds a reporter that keeps incomplete lines in a carry buffer so redaction
 * always runs on whole lines
 * @returns Function returning the redacted progress line for a chunk, if any
 */
export const createProgressReporter = (): ((chunk: string) => string | undefined) => {
    let carry = '';

    return (chunk: string): string | undefined => {
        const combined = carry + chunk;
        const lastBreak = Math.max(combined.lastIndexOf('\n'), combined.lastIndexOf('\r'));

        if (lastBreak === -1) {
            carry = combined.slice(0, PROGRESS_CARRY_LIMIT);
            return undefined;
        }

        carry = combined.slice(lastBreak + 1, lastBreak + 1 + PROGRESS_CARRY_LIMIT);
        const progress = lastNonEmptyLine(redactSensitiveOutput(combined.slice(0, lastBreak)));
        return progress?.slice(0, PROGRESS_LINE_LIMIT);
    };
};

export const waitForBackendStart = (
    proc: MonitoredProcess,
    { inactivityTimeoutMs, onOutput }: BackendStartOptions,
): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        let settled = false;
        let timeout: NodeJS.Timeout | undefined;

        const settle = (finish: () => void) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            finish();
        };

        const armTimeout = () => {
            timeout = setTimeout(() => {
                settle(() => {
                    proc.kill();
                    reject(
                        new Error(
                            `Supabase produced no output for ${Math.round(inactivityTimeoutMs / 1000)}s while starting.`,
                        ),
                    );
                });
            }, inactivityTimeoutMs);
        };

        const onData = (chunk: Buffer | string) => {
            if (settled) return;
            clearTimeout(timeout);
            armTimeout();
            onOutput?.(chunk.toString());
        };

        proc.stdout?.on('data', onData);
        proc.stderr?.on('data', onData);

        proc.on('close', (code) =>
            settle(() => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Supabase start failed with exit code ${code ?? 'unknown'}.`));
                }
            }),
        );

        proc.on('error', (err) => settle(() => reject(err)));

        armTimeout();
    });

const startBackendAndExtractKeys = async (): Promise<BackendKeys> => {
    console.log(chalk.yellow('🚀 Starting Supabase backend...'));
    const spinner = ora('Waiting for Supabase to initialize...').start();

    const startProc = spawn('bun', ['run', 'backend:start'], {
        cwd: rootDir,
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    let outputTail = '';
    const reportProgress = createProgressReporter();

    try {
        await waitForBackendStart(startProc, {
            inactivityTimeoutMs: BACKEND_START_INACTIVITY_TIMEOUT_MS,
            onOutput: (chunk) => {
                outputTail = (outputTail + chunk).slice(-OUTPUT_TAIL_LIMIT);
                const progress = reportProgress(chunk);
                if (progress) {
                    spinner.text = `Waiting for Supabase to initialize... ${progress}`;
                }
            },
        });
    } catch (error) {
        spinner.fail((error as Error).message);
        const redactedTail = redactSensitiveOutput(outputTail).trim();
        if (redactedTail) {
            console.error(chalk.gray(redactedTail));
        }
        throw error;
    }

    spinner.succeed('Supabase backend started.');
    // Now get all keys from status
    const keysSpinner = ora('Extracting Supabase keys...').start();
    const backendDir = path.join(rootDir, 'apps', 'backend');
    const statusProc = spawn('supabase', ['status', '-o', 'json'], {
        cwd: backendDir,
        shell: true,
    });

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
        statusProc.on('close', onClose);
        statusProc.on('error', onError);
    });
};
