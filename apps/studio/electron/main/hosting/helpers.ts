import { addStandaloneConfig } from '@onlook/foundation';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs';
import { isBinary } from 'istextorbinary';
import { exec } from 'node:child_process';
import { join } from 'node:path';

const SUPPORTED_LOCK_FILES = ['bun.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

type FileRecord = Record<
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

export async function prepareNextProject(projectDir: string) {
    const res = await addStandaloneConfig(projectDir);
    if (!res) {
        return false;
    }

    copyDir(projectDir + '/public', projectDir + '/.next/standalone/public');
    copyDir(projectDir + '/.next/static', projectDir + '/.next/standalone/.next/static');

    for (const lockFile of SUPPORTED_LOCK_FILES) {
        if (existsSync(projectDir + '/' + lockFile)) {
            copyFileSync(projectDir + '/' + lockFile, projectDir + '/.next/standalone/' + lockFile);
            return true;
        }
    }

    return false;
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
        exec(
            buildScript,
            { cwd: folderPath, env: { ...process.env, NODE_ENV: 'production' } },
            (error: Error | null, stdout: string, stderr: string) => {
                if (error) {
                    console.error(`Build script error: ${error}`);
                    resolve({ success: false, error: error.message });
                    return;
                }

                if (stderr) {
                    console.warn(`Build script stderr: ${stderr}`);
                }

                console.log(`Build script output: ${stdout}`);
                resolve({ success: true });
            },
        );
    });
}
