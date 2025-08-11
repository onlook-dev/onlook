import type { Provider } from '@onlook/code-provider';
import {
    CUSTOM_OUTPUT_DIR,
    DefaultSettings,
    EXCLUDED_PUBLISH_DIRECTORIES,
    LOCAL_PRELOAD_SCRIPT_SRC,
    SUPPORTED_LOCK_FILES,
} from '@onlook/constants';
import type { Deployment, deploymentUpdateSchema } from '@onlook/db';
import { addBuiltWithScript, injectBuiltWithScript } from '@onlook/growth';
import { DeploymentStatus } from '@onlook/models';
import { addNextBuildConfig } from '@onlook/parser';
import { isEmptyString, isNullOrUndefined, updateGitignore, type FileOperations } from '@onlook/utility';
import { addDeploymentLog } from './helpers/logs';
import { uploadBufferAndGetSignedUrl } from '@/server/utils/supabase/admin-storage';
import type { z } from 'zod';

//

export class PublishManager {
    constructor(private readonly provider: Provider) { }

    private get fileOperations(): FileOperations {
        return {
            readFile: async (path: string) => {
                const { file } = await this.provider.readFile({
                    args: {
                        path,
                    },
                });
                return file.toString();
            },
            writeFile: async (path: string, content: string) => {
                const res = await this.provider.writeFile({
                    args: {
                        path,
                        content,
                        overwrite: true,
                    },
                });
                return res.success;
            },
            fileExists: async (path: string) => {
                try {
                    const stat = await this.provider.statFile({
                        args: {
                            path,
                        },
                    });
                    return stat.type === 'file';
                } catch (error) {
                    console.error(`Error checking file existence at ${path}:`, error);
                    return false;
                }
            },
            copy: async (
                source: string,
                destination: string,
                recursive?: boolean,
                overwrite?: boolean,
            ) => {
                await this.provider.copyFiles({
                    args: {
                        sourcePath: source,
                        targetPath: destination,
                        recursive,
                        overwrite,
                    },
                });
                return true;
            },
            delete: async (path: string, recursive?: boolean) => {
                await this.provider.deleteFiles({
                    args: {
                        path,
                        recursive,
                    },
                });
                return true;
            },
        };
    }



    private async addBadge(folderPath: string) {
        await injectBuiltWithScript(folderPath, this.fileOperations);
        await addBuiltWithScript(folderPath, this.fileOperations);
    }

    private async prepareProject() {
        const preprocessSuccess = await addNextBuildConfig(this.fileOperations);

        if (!preprocessSuccess) {
            throw new Error('Failed to prepare project for deployment');
        }

        const gitignoreSuccess = await updateGitignore(CUSTOM_OUTPUT_DIR, this.fileOperations);
        if (!gitignoreSuccess) {
            console.warn('Failed to update .gitignore');
        }
    }

    private async runBuildStep(buildScript: string, buildFlags: string): Promise<void> {
        try {
            const buildFlagsString = isNullOrUndefined(buildFlags)
                ? DefaultSettings.EDITOR_SETTINGS.buildFlags
                : buildFlags;

            const buildCommand = isEmptyString(buildFlagsString)
                ? buildScript
                : `${buildScript} -- ${buildFlagsString}`;

            const { output } = await this.provider.runCommand({
                args: {
                    command: BUILD_SCRIPT_NO_LINT,
                },
            });
            console.log('Build output: ', output);
        } catch (error) {
            console.error('Failed to run build step', error);
            throw error;
        }
    }

    private async postprocessBuild(): Promise<{
        success: boolean;
        error?: string;
    }> {
        const entrypointExists = await this.fileOperations.fileExists(
            `${CUSTOM_OUTPUT_DIR}/standalone/server.js`,
        );

        if (!entrypointExists) {
            return {
                success: false,
                error: `Failed to find entrypoint server.js in ${CUSTOM_OUTPUT_DIR}/standalone`,
            };
        }

        await this.fileOperations.copy(
            `public`,
            `${CUSTOM_OUTPUT_DIR}/standalone/public`,
            true,
            true,
        );
        await this.fileOperations.copy(
            `${CUSTOM_OUTPUT_DIR}/static`,
            `${CUSTOM_OUTPUT_DIR}/standalone/${CUSTOM_OUTPUT_DIR}/static`,
            true,
            true,
        );

        for (const lockFile of SUPPORTED_LOCK_FILES) {
            const lockFileExists = await this.fileOperations.fileExists(`./${lockFile}`);
            if (lockFileExists) {
                await this.fileOperations.copy(
                    `./${lockFile}`,
                    `${CUSTOM_OUTPUT_DIR}/standalone/${lockFile}`,
                    true,
                    true,
                );
                return { success: true };
            }
        }

        return {
            success: false,
            error:
                'Failed to find lock file. Supported lock files: ' +
                SUPPORTED_LOCK_FILES.join(', '),
        };
    }

    // serializeFiles removed in favor of artifact-based deployment

    // processFilesInChunks removed

    

    

    private getProcessMemoryUsageSnapshot(): {
        rssMB: number;
        heapTotalMB: number;
        heapUsedMB: number;
        externalMB: number;
        arrayBuffersMB: number;
    } {
        const mem = typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage() : ({} as NodeJS.MemoryUsage);
        const toMB = (bytes: number | undefined) => (typeof bytes === 'number' ? +(bytes / (1024 * 1024)).toFixed(2) : 0);
        return {
            rssMB: toMB(mem.rss),
            heapTotalMB: toMB(mem.heapTotal),
            heapUsedMB: toMB(mem.heapUsed),
            externalMB: toMB(mem.external),
            arrayBuffersMB: toMB((mem as unknown as { arrayBuffers?: number }).arrayBuffers),
        };
    }

    private logMemoryUsage(label: string, deploymentId?: string): void {
        const mem = this.getProcessMemoryUsageSnapshot();
        const message = `${label} – Memory (MB): rss=${mem.rssMB}, heapUsed=${mem.heapUsedMB}, heapTotal=${mem.heapTotalMB}, external=${mem.externalMB}, arrayBuffers=${mem.arrayBuffersMB}`;
        console.log(message);
        if (deploymentId) {
            addDeploymentLog(deploymentId, message, 'debug');
        }
    }

    

    

    

    

    

            await onChunkComplete(chunkData, {
                index: chunkIndex,
                total: chunks.length,
                filesProcessed: chunkIndex * chunkSize + chunk.length,
                totalFiles: filePaths.length,
            });

            console.log(
                `Completed chunk ${chunkIndex + 1}/${chunks.length}. Total processed: ${(chunkIndex + 1) * chunkSize}/${filePaths.length} (${timer.getElapsed()}ms elapsed)`,
            );

            chunkData = null;
            await this.yieldForGarbageCollection();
        }

        console.log(`Completed all chunks in ${timer.getElapsed()}ms`);
    }

    private async processChunkWithBatching(
        filePaths: string[],
        currentDir: string,
        batchSize: number,
        fileType: 'text' | 'binary',
    ): Promise<Record<string, FreestyleFile>> {
        console.log(`Processing ${filePaths.length} files in batches of ${batchSize}`);

        const chunkData: Record<string, FreestyleFile> = {};

        for (let i = 0; i < filePaths.length; i += batchSize) {
            const batch = filePaths.slice(i, i + batchSize);
            const batchIndex = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(filePaths.length / batchSize);

            const startTime = Date.now();

            let batchResults: Record<string, FreestyleFile>;
            if (fileType === 'text') {
                batchResults = await this.processTextFilesBatch(batch, currentDir);
            } else {
                batchResults = await this.processBinaryFilesBatch(batch, currentDir);
            }

            const endTime = Date.now();
            console.log(
                `Batch ${batchIndex}/${totalBatches} completed (${batch.length} files) in ${endTime - startTime}ms`,
            );

            Object.assign(chunkData, batchResults);
        }

        return chunkData;
    }

    private async yieldForGarbageCollection(): Promise<void> {
        await new Promise((resolve) => setImmediate(resolve));
        await new Promise((resolve) => setTimeout(resolve, 0));
    }

    private createChunks<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    private async collectAllFilePaths(rootDir: string): Promise<string[]> {
        const allPaths: string[] = [];
        const dirsToProcess = [rootDir];

        while (dirsToProcess.length > 0) {
            const currentDir = dirsToProcess.shift()!;
            try {
                const { files } = await this.provider.listFiles({
                    args: {
                        path: currentDir,
                    },
                });

                for (const entry of files) {
                    const fullPath = `${currentDir}/${entry.name}`;

                    if (entry.type === 'directory') {
                        if (!EXCLUDED_PUBLISH_DIRECTORIES.includes(entry.name)) {
                            dirsToProcess.push(fullPath);
                        }
                    } else if (entry.type === 'file') {
                        allPaths.push(fullPath);
                    }
                }
            } catch (error) {
                console.warn(`Error reading directory ${currentDir}:`, error);
            }
        }

        return allPaths;
    }

    private shouldSkipFile(filePath: string): boolean {
        return (
            filePath.includes('node_modules') ||
            filePath.includes('.git/') ||
            filePath.includes('/.next/') ||
            filePath.includes('/dist/') ||
            filePath.includes('/build/') ||
            filePath.includes('/coverage/') ||
            filePath.endsWith(LOCAL_PRELOAD_SCRIPT_SRC)
        );
    }

    private categorizeFiles(filePaths: string[]): { binaryFiles: string[]; textFiles: string[] } {
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

    private async processTextFilesBatch(
        filePaths: string[],
        baseDir: string,
    ): Promise<Record<string, FreestyleFile>> {
        const promises = filePaths.map(async (fullPath) => {
            const relativePath = fullPath.replace(baseDir + '/', '');

            try {
                const { file } = await this.provider.readFile({
                    args: {
                        path: fullPath,
                    },
                });
                return {
                    path: relativePath,
                    file: {
                        content: file.toString(),
                        encoding: 'utf-8' as const,
                    },
                };
            } catch (error) {
                console.warn(`Error processing ${relativePath}:`, error);
                return null;
            }
        });

        const results = await Promise.all(promises);
        const files: Record<string, FreestyleFile> = {};

        for (const result of results) {
            if (result) {
                files[result.path] = result.file;
            }
        }

        return files;
    }

    private async processBinaryFilesBatch(
        filePaths: string[],
        baseDir: string,
    ): Promise<Record<string, FreestyleFile>> {
        const promises = filePaths.map(async (fullPath) => {
            const relativePath = fullPath.replace(baseDir + '/', '');

            try {
                const { file } = await this.provider.readFile({
                    args: {
                        path: fullPath,
                    },
                });

                if (file && file.type === 'binary' && file.content instanceof Uint8Array) {
                    const base64String = convertToBase64(file.content);
                    return {
                        path: relativePath,
                        file: {
                            content: base64String,
                            encoding: 'base64' as const,
                        },
                    };
                } else {
                    console.warn(
                        `[processBinaryFilesBatch] Failed to read binary content for ${relativePath}`,
                    );
                    return null;
                }
            } catch (error) {
                console.warn(`Error processing ${relativePath}:`, error);
                return null;
            }
        });

        const results = await Promise.all(promises);
        const files: Record<string, FreestyleFile> = {};

        for (const result of results) {
            if (result) {
                files[result.path] = result.file;
            }
        }

        return files;
    }

    // New flow: build → postprocess → archive → upload → return signed URL
    async buildAndUploadArtifact({
        buildScript,
        buildFlags,
        skipBadge,
        deploymentId,
        updateDeployment,
    }: {
        buildScript: string;
        buildFlags: string;
        skipBadge: boolean;
        deploymentId: string;
        updateDeployment: (
            deployment: z.infer<typeof deploymentUpdateSchema>,
        ) => Promise<Deployment | null>;
    }): Promise<string> {
        await this.prepareProject();
        addDeploymentLog(deploymentId, 'Project prepared for deployment', 'debug');
        this.logMemoryUsage('After prepareProject', deploymentId);
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
            addDeploymentLog(deploymentId, 'Badge injected', 'debug');
            this.logMemoryUsage('After badge injection', deploymentId);
        }

        await updateDeployment({
            status: DeploymentStatus.IN_PROGRESS,
            message: 'Building project...',
            progress: 40,
        });
        addDeploymentLog(deploymentId, `Running build: ${buildScript} ${buildFlags ?? ''}`.trim(), 'info');
        this.logMemoryUsage('Before build', deploymentId);
        await this.runBuildStep(buildScript, buildFlags);
        addDeploymentLog(deploymentId, 'Build step completed', 'success');
        this.logMemoryUsage('After build', deploymentId);

        await updateDeployment({
            status: DeploymentStatus.IN_PROGRESS,
            message: 'Postprocessing project...',
            progress: 50,
        });

        const { success: postprocessSuccess, error: postprocessError } =
            await this.postprocessBuild();
        if (!postprocessSuccess) {
            addDeploymentLog(deploymentId, `Postprocess failed: ${postprocessError ?? ''}`, 'error');
            throw new Error(`Failed to postprocess project for deployment: ${postprocessError}`);
        }
        addDeploymentLog(deploymentId, 'Postprocess completed', 'success');
        this.logMemoryUsage('After postprocess', deploymentId);

        const NEXT_BUILD_OUTPUT_PATH = `${CUSTOM_OUTPUT_DIR}/standalone`;

        await updateDeployment({
            status: DeploymentStatus.IN_PROGRESS,
            message: 'Creating build artifact...',
            progress: 60,
        });

        // Create tar.gz inside sandbox
        const artifactLocalPath = `${CUSTOM_OUTPUT_DIR}/standalone.tar.gz`;
        const tarCommand = `tar -czf ${artifactLocalPath} -C ${NEXT_BUILD_OUTPUT_PATH} .`;
        addDeploymentLog(deploymentId, 'Creating tar.gz artifact', 'debug');
        await this.session.commands.run(tarCommand);
        this.logMemoryUsage('After tar artifact creation', deploymentId);

        await updateDeployment({
            status: DeploymentStatus.IN_PROGRESS,
            message: 'Uploading build artifact...',
            progress: 70,
        });

        // Read artifact bytes and upload to storage
        this.logMemoryUsage('Before reading artifact bytes', deploymentId);
        const artifactBytes = await this.session.fs.readFile(artifactLocalPath);
        if (!artifactBytes) {
            addDeploymentLog(deploymentId, 'Failed to read build artifact', 'error');
            throw new Error('Failed to read build artifact');
        }
        const bytes: Uint8Array = artifactBytes as unknown as Uint8Array;
        this.logMemoryUsage('After reading artifact bytes', deploymentId);

        const objectPath = `deployments/${deploymentId}/build.tar.gz`;
        addDeploymentLog(deploymentId, 'Uploading artifact to storage', 'info');
        const { signedUrl }: { signedUrl: string } = await uploadBufferAndGetSignedUrl(
            STORAGE_BUCKETS.FILE_TRANSFER,
            objectPath,
            bytes,
            {
                contentType: 'application/gzip',
                cacheControl: 'public, max-age=31536000, immutable',
                upsert: true,
                expiresInSeconds: 60 * 60, // 1 hour is enough for Freestyle to fetch
            },
        );
        this.logMemoryUsage('After upload to storage', deploymentId);

        // Remove local artifact from sandbox to free disk space
        try {
            await this.session.fs.remove(artifactLocalPath, false);
            addDeploymentLog(deploymentId, 'Local artifact deleted from sandbox', 'debug');
            this.logMemoryUsage('After deleting local artifact', deploymentId);
        } catch (cleanupError) {
            console.warn('Failed to delete local artifact:', cleanupError);
            addDeploymentLog(
                deploymentId,
                `Warning: failed to delete local artifact (${String(cleanupError)})`,
                'debug',
            );
        }

        await updateDeployment({
            status: DeploymentStatus.IN_PROGRESS,
            message: 'Artifact ready. Deploying...',
            progress: 80,
        });
        addDeploymentLog(deploymentId, 'Artifact uploaded; proceeding to deployment', 'success');

        return String(signedUrl);
    }
}
