import { type WebSocketSession } from '@codesandbox/sdk';
import { CUSTOM_OUTPUT_DIR, DefaultSettings, EXCLUDED_PUBLISH_DIRECTORIES, LOCAL_PRELOAD_SCRIPT_SRC, SUPPORTED_LOCK_FILES } from '@onlook/constants';
import type { Deployment, deploymentUpdateSchema } from '@onlook/db';
import { addBuiltWithScript, injectBuiltWithScript } from '@onlook/growth';
import { DeploymentStatus } from '@onlook/models';
import { addNextBuildConfig } from '@onlook/parser';
import { convertToBase64, isBinaryFile, isEmptyString, isNullOrUndefined, LogTimer, updateGitignore, type FileOperations } from '@onlook/utility';
import {
    type FreestyleFile,
} from 'freestyle-sandboxes';
import type { z } from 'zod';

export class PublishManager {
    constructor(
        private readonly session: WebSocketSession,
    ) { }

    private get fileOps(): FileOperations {
        return {
            readFile: async (path: string) => this.session.fs.readTextFile(path),
            writeFile: async (path: string, content: string) => {
                await this.session.fs.writeTextFile(path, content);
                return true;
            },
            fileExists: async (path: string) => {
                try {
                    const stat = await this.session.fs.stat(path);
                    return stat.type === 'file';
                } catch (error) {
                    console.error(`[fileExists] Error checking if file exists at ${path}:`, error);
                    return false;
                }
            },
            copy: async (source: string, destination: string, recursive?: boolean, overwrite?: boolean) => {
                await this.session.fs.copy(source, destination, recursive, overwrite);
                return true;
            },
            delete: async (path: string, recursive?: boolean) => {
                await this.session.fs.remove(path, recursive);
                return true;
            },
        };
    }

    async publish({
        buildScript,
        buildFlags,
        skipBadge,
        updateDeployment,
    }: {
        buildScript: string;
        buildFlags: string;
        skipBadge: boolean;
        updateDeployment: (deployment: z.infer<typeof deploymentUpdateSchema>) => Promise<Deployment | null>;
    }): Promise<Record<string, FreestyleFile>> {
        await this.runPrepareStep();
        await updateDeployment({
            status: DeploymentStatus.IN_PROGRESS,
            message: 'Preparing deployment...',
            progress: 30,
        });

        if (!skipBadge) {
            await updateDeployment({
                status: DeploymentStatus.IN_PROGRESS,
                message: 'Adding "Built with Onlook" badge...',
                progress: 35,
            });
            await this.addBadge('./');
        }

        await updateDeployment({
            status: DeploymentStatus.IN_PROGRESS,
            message: 'Building project...',
            progress: 40,
        });

        await this.runBuildStep(buildScript, buildFlags);

        await updateDeployment({
            status: DeploymentStatus.IN_PROGRESS,
            message: 'Postprocessing project...',
            progress: 50,
        });
        const { success: postprocessSuccess, error: postprocessError } = await this.postprocessNextBuild();

        if (!postprocessSuccess) {
            throw new Error(
                `Failed to postprocess project for deployment, error: ${postprocessError}`,
            );
        }

        await updateDeployment({
            status: DeploymentStatus.IN_PROGRESS,
            message: 'Preparing files for publish...',
            progress: 60,
        });

        // Serialize the files for deployment
        const NEXT_BUILD_OUTPUT_PATH = `${CUSTOM_OUTPUT_DIR}/standalone`;
        return await this.serializeFiles(NEXT_BUILD_OUTPUT_PATH);
    }

    private async addBadge(folderPath: string) {
        await injectBuiltWithScript(folderPath, this.fileOps);
        await addBuiltWithScript(folderPath, this.fileOps);
    }

    private async runPrepareStep() {
        // Preprocess the project
        const preprocessSuccess = await addNextBuildConfig(this.fileOps);

        if (!preprocessSuccess) {
            throw new Error(`Failed to prepare project for deployment`);
        }

        // Update .gitignore to ignore the custom output directory
        const gitignoreSuccess = await updateGitignore(CUSTOM_OUTPUT_DIR, this.fileOps);
        if (!gitignoreSuccess) {
            console.warn('Failed to update .gitignore');
        }
    }

    private async runBuildStep(buildScript: string, buildFlags: string): Promise<void> {
        try {
            // Use default build flags if no build flags are provided
            const buildFlagsString: string = isNullOrUndefined(buildFlags)
                ? DefaultSettings.EDITOR_SETTINGS.buildFlags
                : buildFlags;

            const BUILD_SCRIPT_NO_LINT = isEmptyString(buildFlagsString)
                ? buildScript
                : `${buildScript} -- ${buildFlagsString}`;

            const output = await this.session.commands.run(BUILD_SCRIPT_NO_LINT);
            console.log('Build output: ', output);
        } catch (error) {
            console.error('Failed to run build step', error);
            throw error;
        }
    }

    private async postprocessNextBuild(): Promise<{
        success: boolean;
        error?: string;
    }> {
        const entrypointExists = await this.fileOps.fileExists(
            `${CUSTOM_OUTPUT_DIR}/standalone/server.js`,
        );
        if (!entrypointExists) {
            return {
                success: false,
                error: `Failed to find entrypoint server.js in ${CUSTOM_OUTPUT_DIR}/standalone`,
            };
        }

        await this.fileOps.copy(`public`, `${CUSTOM_OUTPUT_DIR}/standalone/public`, true, true);
        await this.fileOps.copy(
            `${CUSTOM_OUTPUT_DIR}/static`,
            `${CUSTOM_OUTPUT_DIR}/standalone/${CUSTOM_OUTPUT_DIR}/static`,
            true,
            true,
        );

        for (const lockFile of SUPPORTED_LOCK_FILES) {
            const lockFileExists = await this.fileOps.fileExists(`./${lockFile}`);
            if (lockFileExists) {
                await this.fileOps.copy(
                    `./${lockFile}`,
                    `${CUSTOM_OUTPUT_DIR}/standalone/${lockFile}`,
                    true,
                    true,
                );
                return { success: true };
            } else {
                console.error(`lockFile not found: ${lockFile}`);
            }
        }

        return {
            success: false,
            error:
                'Failed to find lock file. Supported lock files: ' +
                SUPPORTED_LOCK_FILES.join(', '),
        };
    }

    /**
     * Serialize files from a directory into a record of file paths to their content
     * Memory-optimized version using chunking + batching approach
     * @param currentDir - The directory path to serialize
     * @returns Record of file paths to their content (base64 for binary, utf-8 for text)
     */
    private async serializeFiles(currentDir: string): Promise<Record<string, FreestyleFile>> {
        const timer = new LogTimer('File Serialization');
        const startTime = Date.now();

        try {
            const allFilePaths = await this.getAllFilePathsFlat(currentDir);
            timer.log(`File discovery completed - ${allFilePaths.length} files found`);

            const filteredPaths = allFilePaths.filter(filePath => !this.shouldSkipFile(filePath));
            timer.log(`Filtered to ${filteredPaths.length} files after exclusions`);

            const { binaryFiles, textFiles } = this.categorizeFiles(filteredPaths);
            timer.log(`Categorized: ${textFiles.length} text files, ${binaryFiles.length} binary files`);

            const files: Record<string, FreestyleFile> = {};
            
            if (textFiles.length > 0) {
                timer.log(`Processing ${textFiles.length} text files using chunking + batching`);
                const textResults = await this.processFilesWithChunkingAndBatching(textFiles, currentDir, false);
                Object.assign(files, textResults);
                timer.log('Text files processing completed');
            }

            if (binaryFiles.length > 0) {
                timer.log(`Processing ${binaryFiles.length} binary files using chunking + batching`);
                const binaryResults = await this.processFilesWithChunkingAndBatching(binaryFiles, currentDir, true);
                Object.assign(files, binaryResults);
                timer.log('Binary files processing completed');
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;
            timer.log(`Serialization completed - ${Object.keys(files).length} files processed in ${totalTime}ms`);
            return files;
        } catch (error) {
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            console.error(`[serializeFiles] Error during serialization after ${totalTime}ms:`, error);
            throw error;
        }
    }

    /**
     * Process files using chunking + batching approach
     * 1. Split files into chunks
     * 2. Process each chunk in batches
     * 3. Clean up memory after each chunk
     */
    private async processFilesWithChunkingAndBatching(
        filePaths: string[], 
        baseDir: string, 
        isBinary: boolean,
        chunkSize = 100,
        batchSize = 10
    ): Promise<Record<string, FreestyleFile>> {
        const files: Record<string, FreestyleFile> = {};
        const totalFiles = filePaths.length;
        let processedCount = 0;
        const chunkStartTime = Date.now();

        for (let i = 0; i < filePaths.length; i += chunkSize) {
            const chunk = filePaths.slice(i, i + chunkSize);
            const chunkNumber = Math.floor(i / chunkSize) + 1;
            const totalChunks = Math.ceil(filePaths.length / chunkSize);
            console.log(`Processing chunk ${chunkNumber}/${totalChunks} (${chunk.length} files)`);
            
            const chunkResults = await this.processChunkInBatches(chunk, baseDir, isBinary, batchSize);
            Object.assign(files, chunkResults);
            
            processedCount += chunk.length;
            const chunkTime = Date.now() - chunkStartTime;
            console.log(`Completed chunk ${chunkNumber}/${totalChunks}. Total processed: ${processedCount}/${totalFiles} (${chunkTime}ms elapsed)`);
            
            if (global.gc) {
                global.gc();
            }
        }

        const totalChunkTime = Date.now() - chunkStartTime;
        console.log(`Completed all chunks in ${totalChunkTime}ms`);
        return files;
    }

    private async processChunkInBatches(
        chunk: string[], 
        baseDir: string, 
        isBinary: boolean,
        batchSize = 10
    ): Promise<Record<string, FreestyleFile>> {
        const files: Record<string, FreestyleFile> = {};
        const batchStartTime = Date.now();

        for (let i = 0; i < chunk.length; i += batchSize) {
            const batch = chunk.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(chunk.length / batchSize);
            
            const batchPromises = batch.map(filePath => 
                isBinary 
                    ? this.processBinaryFile(filePath, baseDir)
                    : this.processTextFile(filePath, baseDir)
            );
            
            const batchResults = await Promise.all(batchPromises);
            
            // Add successful results to files
            for (const result of batchResults) {
                if (result) {
                    files[result.path] = result.file;
                }
            }

            const batchTime = Date.now() - batchStartTime;
            console.log(`  Batch ${batchNumber}/${totalBatches} completed (${batch.length} files) in ${batchTime}ms`);
        }

        const totalBatchTime = Date.now() - batchStartTime;
        console.log(`  All batches completed in ${totalBatchTime}ms`);
        return files;
    }

    private async processTextFile(fullPath: string, baseDir: string): Promise<{ path: string; file: FreestyleFile } | null> {
        const relativePath = fullPath.replace(baseDir + '/', '');

        try {
            const textContent = await this.session.fs.readTextFile(fullPath);

            if (textContent !== null) {
                // Skip very large text files to prevent memory issues
                const MAX_TEXT_SIZE = 5 * 1024 * 1024; // 5MB limit for text files
                if (textContent.length > MAX_TEXT_SIZE) {
                    console.warn(`[processTextFile] Skipping large text file ${relativePath} (${textContent.length} bytes)`);
                    return null;
                }

                return {
                    path: relativePath,
                    file: {
                        content: textContent,
                        encoding: 'utf-8' as const,
                    }
                };
            } else {
                console.warn(`[processTextFile] Failed to read text content for ${relativePath}`);
                return null;
            }
        } catch (error) {
            console.warn(`[processTextFile] Error processing ${relativePath}:`, error);
            return null;
        }
    }


    private async processBinaryFile(fullPath: string, baseDir: string): Promise<{ path: string; file: FreestyleFile } | null> {
        const relativePath = fullPath.replace(baseDir + '/', '');

        try {
            const binaryContent = await this.session.fs.readFile(fullPath);

            if (binaryContent) {
                // For very large binary files, consider skipping or compressing ??
                const MAX_BINARY_SIZE = 10 * 1024 * 1024; // 10MB limit
                if (binaryContent.length > MAX_BINARY_SIZE) {
                    console.warn(`[processBinaryFile] Skipping large binary file ${relativePath} (${binaryContent.length} bytes)`);
                    return null;
                }

                const base64String = convertToBase64(binaryContent);

                return {
                    path: relativePath,
                    file: {
                        content: base64String,
                        encoding: 'base64' as const,
                    }
                };
            } else {
                console.warn(`[processBinaryFile] Failed to read binary content for ${relativePath}`);
                return null;
            }
        } catch (error) {
            console.warn(`[processBinaryFile] Error processing ${relativePath}:`, error);
            return null;
        }
    }



    /**
     * Get all file paths in a directory tree using memory-efficient streaming
     * Instead of accumulating all paths in memory, we yield them one by one
     */
    private async getAllFilePathsFlat(rootDir: string): Promise<string[]> {
        const allPaths: string[] = [];
        const dirsToProcess = [rootDir];

        while (dirsToProcess.length > 0) {
            const currentDir = dirsToProcess.shift()!;
            try {
                const entries = await this.session.fs.readdir(currentDir);

                for (const entry of entries) {
                    const fullPath = `${currentDir}/${entry.name}`;

                    if (entry.type === 'directory') {
                        // Skip node_modules and other heavy directories early
                        if (!EXCLUDED_PUBLISH_DIRECTORIES.includes(entry.name)) {
                            dirsToProcess.push(fullPath);
                        }
                    } else if (entry.type === 'file') {
                        allPaths.push(fullPath);
                    }
                }
            } catch (error) {
                console.warn(`[getAllFilePathsFlat] Error reading directory ${currentDir}:`, error);
            }
        }

        return allPaths;
    }
    /**
     * Check if a file should be skipped
     */
    private shouldSkipFile(filePath: string): boolean {
        return filePath.includes('node_modules') ||
            filePath.includes('.git/') ||
            filePath.includes('/.next/') ||
            filePath.includes('/dist/') ||
            filePath.includes('/build/') ||
            filePath.includes('/coverage/') ||
            filePath.endsWith(LOCAL_PRELOAD_SCRIPT_SRC);
    }

    private categorizeFiles(filePaths: string[]): { binaryFiles: string[], textFiles: string[] } {
        const binaryFiles: string[] = [];
        const textFiles: string[] = [];

        for (const filePath of filePaths) {
            const fileName = filePath.split('/').pop() ?? '';
            if (isBinaryFile(fileName)) {
                binaryFiles.push(filePath);
            } else {
                textFiles.push(filePath);
            }
        }

        return { binaryFiles, textFiles };
    }
}