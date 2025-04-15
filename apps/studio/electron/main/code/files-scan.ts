import { promises as fs } from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';
import { CUSTOM_OUTPUT_DIR } from '@onlook/models';

export interface FileNode {
    id: string;
    name: string;
    path: string;
    isDirectory: boolean;
    children?: FileNode[];
    extension?: string;
}

// Directories to ignore during scanning
const IGNORED_DIRECTORIES = ['node_modules', '.git', '.next', 'dist', 'build', CUSTOM_OUTPUT_DIR];

// Extensions focus for code editing
const PREFERRED_EXTENSIONS = [
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.html',
    '.css',
    '.scss',
    '.json',
    '.md',
    '.mdx',
];

/**
 * Scans a directory recursively to build a tree of files and folders
 */
async function scanDirectory(
    dir: string,
    maxDepth: number = 10,
    currentDepth: number = 0,
): Promise<FileNode[]> {
    // Prevents infinite recursion and going too deep
    if (currentDepth >= maxDepth) {
        return [];
    }

    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const nodes: FileNode[] = [];

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            // Skips ignored directories
            if (entry.isDirectory() && IGNORED_DIRECTORIES.includes(entry.name)) {
                continue;
            }

            if (entry.isDirectory()) {
                const children = await scanDirectory(fullPath, maxDepth, currentDepth + 1);
                if (children.length > 0) {
                    nodes.push({
                        id: nanoid(),
                        name: entry.name,
                        path: fullPath,
                        isDirectory: true,
                        children,
                    });
                }
            } else {
                const extension = path.extname(entry.name);
                nodes.push({
                    id: nanoid(),
                    name: entry.name,
                    path: fullPath,
                    isDirectory: false,
                    extension,
                });
            }
        }

        // Sorts directories first, then files
        return nodes.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) {
                return -1;
            }
            if (!a.isDirectory && b.isDirectory) {
                return 1;
            }
            return a.name.localeCompare(b.name);
        });
    } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error);
        return [];
    }
}

/**
 * Scans project files and returns a tree structure
 */
export async function scanProjectFiles(projectRoot: string): Promise<FileNode[]> {
    try {
        return await scanDirectory(projectRoot);
    } catch (error) {
        console.error('Error scanning project files:', error);
        return [];
    }
}

/**
 * Gets a flat list of all files with specified extensions
 */
export async function getProjectFiles(
    projectRoot: string,
    extensions: string[] = PREFERRED_EXTENSIONS,
): Promise<FileNode[]> {
    const allFiles: FileNode[] = [];

    async function collectFiles(dir: string): Promise<void> {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    if (!IGNORED_DIRECTORIES.includes(entry.name)) {
                        await collectFiles(fullPath);
                    }
                } else {
                    const extension = path.extname(entry.name);
                    if (extensions.length === 0 || extensions.includes(extension)) {
                        allFiles.push({
                            id: nanoid(),
                            name: entry.name,
                            path: fullPath,
                            isDirectory: false,
                            extension,
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`Error collecting files from ${dir}:`, error);
        }
    }

    await collectFiles(projectRoot);
    return allFiles;
}
