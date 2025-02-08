import { addNextBuildConfig } from '@onlook/foundation';
import { CUSTOM_OUTPUT_DIR } from '@onlook/models/constants';
import {
    appendFileSync,
    copyFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    statSync,
} from 'fs';
import { isBinary } from 'istextorbinary';
import { join } from 'node:path';
import { runBunCommand } from '../bun';

const SUPPORTED_LOCK_FILES = ['bun.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

export type FileRecord = Record<
    string,
    {
        content: string;
        encoding: string;
    }
>;

export function serializeFiles(currentDir: string, basePath: string = ''): FileRecord {
    const files: FileRecord = {};
    for (const entry of readdirSync(currentDir)) {
        const entryPath = join(currentDir, entry);
        if (entryPath.includes('node_modules')) {
            continue;
        }

        const stats = statSync(entryPath);
        if (stats.isDirectory()) {
            Object.assign(files, serializeFiles(entryPath, `${basePath}${entry}/`));
        } else if (stats.isFile()) {
            const buffer = readFileSync(entryPath);

            // @ts-expect-error - incorrect type signature
            if (isBinary(entryPath, buffer)) {
                files[`${basePath}${entry}`] = {
                    content: buffer.toString('base64'),
                    encoding: 'base64',
                };
            } else {
                files[`${basePath}${entry}`] = {
                    content: buffer.toString('utf-8'),
                    encoding: 'utf-8',
                };
            }
        }
    }

    return files;
}

export async function preprocessNextBuild(projectDir: string): Promise<{
    success: boolean;
    error?: string;
}> {
    const res = await addNextBuildConfig(projectDir);
    if (!res) {
        return {
            success: false,
            error: 'Failed to add standalone config to Next.js project. Make sure project is Next.js and next.config.{js|ts|mjs|cjs} is present',
        };
    }

    return { success: true };
}

export async function postprocessNextBuild(projectDir: string): Promise<{
    success: boolean;
    error?: string;
}> {
    const entrypointExists = await checkEntrypointExists(projectDir);
    if (!entrypointExists) {
        return {
            success: false,
            error: `Failed to find entrypoint server.js in ${CUSTOM_OUTPUT_DIR}/standalone`,
        };
    }

    copyDir(`${projectDir}/public`, `${projectDir}/${CUSTOM_OUTPUT_DIR}/standalone/public`);
    copyDir(
        `${projectDir}/${CUSTOM_OUTPUT_DIR}/static`,
        `${projectDir}/${CUSTOM_OUTPUT_DIR}/standalone/${CUSTOM_OUTPUT_DIR}/static`,
    );

    for (const lockFile of SUPPORTED_LOCK_FILES) {
        if (existsSync(`${projectDir}/${lockFile}`)) {
            copyFileSync(
                `${projectDir}/${lockFile}`,
                `${projectDir}/${CUSTOM_OUTPUT_DIR}/standalone/${lockFile}`,
            );
            return { success: true };
        }
    }

    return {
        success: false,
        error: 'Failed to find lock file. Supported lock files: ' + SUPPORTED_LOCK_FILES.join(', '),
    };
}

async function checkEntrypointExists(projectDir: string) {
    return existsSync(join(projectDir, `/${CUSTOM_OUTPUT_DIR}/standalone/server.js`));
}

export function copyDir(src: string, dest: string) {
    if (!existsSync(src)) {
        return;
    }
    mkdirSync(dest, { recursive: true });
    for (const entry of readdirSync(src, { withFileTypes: true })) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            copyFileSync(srcPath, destPath);
        }
    }
}

export function runBuildScript(
    folderPath: string,
    buildScript: string,
): Promise<{
    success: boolean;
    error?: string;
}> {
    return new Promise((resolve, reject) => {
        runBunCommand(buildScript, {
            cwd: folderPath,
            env: { ...process.env, NODE_ENV: 'production' },
            callbacks: {
                onClose: (code, signal) => {
                    console.log(`Build script closed with code ${code} and signal ${signal}`);
                    if (code === 0) {
                        resolve({ success: true });
                    } else {
                        resolve({ success: false, error: 'Build script failed' });
                    }
                },
            },
        });
    });
}

export function updateGitignore(projectDir: string, target: string): boolean {
    const gitignorePath = join(projectDir, '.gitignore');

    try {
        // Create .gitignore if it doesn't exist
        if (!existsSync(gitignorePath)) {
            appendFileSync(gitignorePath, target + '\n');
            return true;
        }

        // Check if target is already in the file
        const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
        const lines = gitignoreContent.split(/\r?\n/);

        // Look for exact match of target
        if (!lines.some((line) => line.trim() === target)) {
            // Ensure there's a newline before adding if the file doesn't end with one
            const separator = gitignoreContent.endsWith('\n') ? '' : '\n';
            appendFileSync(gitignorePath, `${separator}${target}\n`);
        }

        return true;
    } catch (error) {
        console.error(`Failed to update .gitignore: ${error}`);
        return false;
    }
}
