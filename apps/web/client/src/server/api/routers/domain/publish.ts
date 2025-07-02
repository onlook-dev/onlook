import { env } from '@/env';
import { previewDomains, publishedDomains } from '@onlook/db';
import { CUSTOM_OUTPUT_DIR, DefaultSettings, EXCLUDED_PUBLISH_DIRECTORIES, SUPPORTED_LOCK_FILES } from '@onlook/constants';
import { addBuiltWithScript, injectBuiltWithScript, removeBuiltWithScript, removeBuiltWithScriptFromLayout } from '@onlook/growth';
import { PublishStatus, type PublishOptions, type PublishRequest, type PublishResponse, type PublishState } from '@onlook/models';
import { addNextBuildConfig } from '@onlook/parser';
import { isBinaryFile, isEmptyString, isNullOrUndefined, LogTimer, updateGitignore, type FileOperations } from '@onlook/utility';
import { TRPCError } from '@trpc/server';
import { and, eq, inArray } from 'drizzle-orm';
import type { FreestyleFile } from 'freestyle-sandboxes';
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { HostingProviderFactory } from './hosting-factory';
import { HostingProvider } from '@onlook/models';

const execAsync = promisify(exec);

// In-memory store for publish states (can be replaced with Redis in production)
const publishStates = new Map<string, PublishState>();

enum PublishType {
    CUSTOM = 'custom',
    PREVIEW = 'preview',
    UNPUBLISH = 'unpublish',
}

// File operations for server-side processing
const serverFileOps: FileOperations = {
    readFile: async (filePath: string) => {
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch (error) {
            console.error('Error reading file:', error);
            return null;
        }
    },
    writeFile: async (filePath: string, content: string) => {
        try {
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, content, 'utf-8');
            return true;
        } catch (error) {
            console.error('Error writing file:', error);
            return false;
        }
    },
    fileExists: async (filePath: string) => {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    },
    copy: async (source: string, destination: string, recursive?: boolean) => {
        try {
            const stats = await fs.stat(source);
            if (stats.isDirectory() && recursive) {
                await fs.cp(source, destination, { recursive: true });
            } else {
                await fs.mkdir(path.dirname(destination), { recursive: true });
                await fs.copyFile(source, destination);
            }
            return true;
        } catch (error) {
            console.error('Error copying:', error);
            return false;
        }
    },
    delete: async (filePath: string, recursive?: boolean) => {
        try {
            if (recursive) {
                await fs.rm(filePath, { recursive: true, force: true });
            } else {
                await fs.unlink(filePath);
            }
            return true;
        } catch (error) {
            console.error('Error deleting:', error);
            return false;
        }
    },
};

export const publishRouter = createTRPCRouter({
    startPublish: protectedProcedure
        .input(
            z.object({
                type: z.enum(['preview', 'custom']),
                projectId: z.string(),
                projectPath: z.string(),
                request: z.object({
                    buildScript: z.string(),
                    urls: z.array(z.string()),
                    options: z.object({
                        skipBadge: z.boolean().optional(),
                        buildFlags: z.string().optional(),
                        skipBuild: z.boolean().optional(),
                        envVars: z.record(z.string(), z.string()).optional(),
                    }).optional(),
                }),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const publishId = `${input.projectId}-${Date.now()}`;
            const initialState: PublishState = {
                status: PublishStatus.LOADING,
                message: 'Starting deployment...',
                progress: 0,
                buildLog: null,
                error: null,
            };
            
            publishStates.set(publishId, initialState);

            // Start the publish process asynchronously
            publishAsync(
                input.type === 'preview' ? PublishType.PREVIEW : PublishType.CUSTOM,
                input.projectId,
                input.projectPath,
                input.request,
                publishId,
                ctx.db
            ).catch(error => {
                console.error('Publish error:', error);
                publishStates.set(publishId, {
                    status: PublishStatus.ERROR,
                    message: error.message || 'Unknown error occurred',
                    progress: 100,
                    buildLog: null,
                    error: error.message,
                });
            });

            return { publishId };
        }),

    getPublishState: protectedProcedure
        .input(z.object({ publishId: z.string() }))
        .query(async ({ input }) => {
            const state = publishStates.get(input.publishId);
            
            if (!state) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Publish state not found',
                });
            }

            // Clean up completed states after some time
            if (state.status === PublishStatus.PUBLISHED || state.status === PublishStatus.ERROR) {
                setTimeout(() => {
                    publishStates.delete(input.publishId);
                }, 300000); // 5 minutes
            }

            return state;
        }),
});

async function publishAsync(
    type: PublishType,
    projectId: string,
    projectPath: string,
    request: PublishRequest,
    publishId: string,
    db: any
): Promise<void> {
    const updateState = (state: Partial<PublishState>) => {
        const current = publishStates.get(publishId) || {};
        publishStates.set(publishId, { ...current, ...state });
    };

    try {
        const timer = new LogTimer('Deployment');
        const fullProjectPath = path.resolve(projectPath);
        process.chdir(fullProjectPath);

        // Prepare step
        updateState({ status: PublishStatus.LOADING, message: 'Preparing project...', progress: 5 });
        await runPrepareStep(serverFileOps, fullProjectPath);
        timer.log('Prepare completed');

        // Add badge
        if (!request.options?.skipBadge) {
            updateState({ status: PublishStatus.LOADING, message: 'Adding badge...', progress: 10 });
            await addBadge(fullProjectPath, serverFileOps);
            timer.log('"Built with Onlook" badge added');
        }

        // Build step
        if (!request.options?.skipBuild) {
            updateState({ status: PublishStatus.LOADING, message: 'Creating optimized build...', progress: 20 });
            await runBuildStep(request.buildScript, request.options, updateState);
        }
        timer.log('Build completed');

        // Postprocess
        updateState({ status: PublishStatus.LOADING, message: 'Preparing project for deployment...', progress: 60 });
        const { success: postprocessSuccess, error: postprocessError } = await postprocessNextBuild(serverFileOps, fullProjectPath);
        timer.log('Postprocess completed');

        if (!postprocessSuccess) {
            throw new Error(`Failed to postprocess project for deployment, error: ${postprocessError}`);
        }

        // Serialize files
        const NEXT_BUILD_OUTPUT_PATH = path.join(fullProjectPath, CUSTOM_OUTPUT_DIR, 'standalone');
        const files = await serializeFiles(NEXT_BUILD_OUTPUT_PATH);

        updateState({ status: PublishStatus.LOADING, message: 'Deploying project...', progress: 80 });

        // Deploy
        timer.log('Files serialized, sending to Freestyle...');
        const success = await deployWeb(type, projectId, files, request.urls, request.options?.envVars, db);

        if (!success) {
            throw new Error('Failed to deploy project');
        }

        updateState({ status: PublishStatus.PUBLISHED, message: 'Deployment successful. Cleaning up...', progress: 90 });

        // Remove badge
        if (!request.options?.skipBadge) {
            updateState({ status: PublishStatus.LOADING, message: 'Cleaning up...', progress: 90 });
            await removeBadge(fullProjectPath, serverFileOps);
            timer.log('"Built with Onlook" badge removed');
        }

        timer.log('Deployment completed');
        updateState({ status: PublishStatus.PUBLISHED, message: 'Deployment successful!', progress: 100 });

    } catch (error) {
        console.error('Failed to deploy:', error);
        updateState({ 
            status: PublishStatus.ERROR, 
            message: 'Failed to deploy to environment', 
            progress: 100,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

async function addBadge(folderPath: string, fileOps: FileOperations): Promise<void> {
    await injectBuiltWithScript(folderPath, fileOps);
    await addBuiltWithScript(folderPath, fileOps);
}

async function removeBadge(folderPath: string, fileOps: FileOperations): Promise<void> {
    await removeBuiltWithScriptFromLayout(folderPath, fileOps);
    await removeBuiltWithScript(folderPath, fileOps);
}

async function runPrepareStep(fileOps: FileOperations, projectPath: string): Promise<void> {
    const preprocessSuccess = await addNextBuildConfig(fileOps);

    if (!preprocessSuccess) {
        throw new Error(`Failed to prepare project for deployment`);
    }

    const gitignoreSuccess = await updateGitignore(CUSTOM_OUTPUT_DIR, fileOps);
    if (!gitignoreSuccess) {
        console.warn('Failed to update .gitignore');
    }
}

async function runBuildStep(
    buildScript: string, 
    options: PublishOptions | undefined,
    updateState: (state: Partial<PublishState>) => void
): Promise<void> {
    const buildFlagsString: string = isNullOrUndefined(options?.buildFlags)
        ? DefaultSettings.EDITOR_SETTINGS.buildFlags
        : options?.buildFlags || '';

    const BUILD_SCRIPT_NO_LINT = isEmptyString(buildFlagsString)
        ? buildScript
        : `${buildScript} -- ${buildFlagsString}`;

    if (options?.skipBuild) {
        console.log('Skipping build');
        return;
    }

    try {
        const { stdout, stderr } = await execAsync(BUILD_SCRIPT_NO_LINT, {
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });

        if (stderr) {
            console.error('Build stderr:', stderr);
        }
        
        console.log('Build succeeded with output:', stdout);
        updateState({ buildLog: stdout });
    } catch (error: any) {
        throw new Error(`Build failed: ${error.message}`);
    }
}

async function postprocessNextBuild(fileOps: FileOperations, projectPath: string): Promise<{
    success: boolean;
    error?: string;
}> {
    const entrypointPath = path.join(projectPath, CUSTOM_OUTPUT_DIR, 'standalone', 'server.js');
    const entrypointExists = await fileOps.fileExists(entrypointPath);
    
    if (!entrypointExists) {
        return {
            success: false,
            error: `Failed to find entrypoint server.js in ${CUSTOM_OUTPUT_DIR}/standalone`,
        };
    }

    const publicSource = path.join(projectPath, 'public');
    const publicDest = path.join(projectPath, CUSTOM_OUTPUT_DIR, 'standalone', 'public');
    await fileOps.copy(publicSource, publicDest, true, true);

    const staticSource = path.join(projectPath, CUSTOM_OUTPUT_DIR, 'static');
    const staticDest = path.join(projectPath, CUSTOM_OUTPUT_DIR, 'standalone', CUSTOM_OUTPUT_DIR, 'static');
    await fileOps.copy(staticSource, staticDest, true, true);

    for (const lockFile of SUPPORTED_LOCK_FILES) {
        const lockFilePath = path.join(projectPath, lockFile);
        const lockFileExists = await fileOps.fileExists(lockFilePath);
        if (lockFileExists) {
            const lockFileDest = path.join(projectPath, CUSTOM_OUTPUT_DIR, 'standalone', lockFile);
            await fileOps.copy(lockFilePath, lockFileDest, true, true);
            return { success: true };
        }
    }

    return {
        success: false,
        error: 'Failed to find lock file. Supported lock files: ' + SUPPORTED_LOCK_FILES.join(', '),
    };
}

async function serializeFiles(currentDir: string): Promise<Record<string, FreestyleFile>> {
    const timer = new LogTimer('File Serialization');
    const files: Record<string, FreestyleFile> = {};

    try {
        const allFilePaths = await getAllFilePathsFlat(currentDir);
        timer.log(`File discovery completed - ${allFilePaths.length} files found`);

        const filteredPaths = allFilePaths.filter(filePath => !shouldSkipFile(filePath));
        const { binaryFiles, textFiles } = categorizeFiles(filteredPaths);

        const BATCH_SIZE = 50;

        // Process text files
        if (textFiles.length > 0) {
            timer.log(`Processing ${textFiles.length} text files in batches of ${BATCH_SIZE}`);
            for (let i = 0; i < textFiles.length; i += BATCH_SIZE) {
                const batch = textFiles.slice(i, i + BATCH_SIZE);
                const batchFiles = await processTextFilesBatch(batch, currentDir);
                Object.assign(files, batchFiles);
            }
        }

        // Process binary files
        if (binaryFiles.length > 0) {
            timer.log(`Processing ${binaryFiles.length} binary files in batches of ${BATCH_SIZE}`);
            for (let i = 0; i < binaryFiles.length; i += BATCH_SIZE) {
                const batch = binaryFiles.slice(i, i + BATCH_SIZE);
                const batchFiles = await processBinaryFilesBatch(batch, currentDir);
                Object.assign(files, batchFiles);
            }
        }

        timer.log(`Serialization completed - ${Object.keys(files).length} files processed`);
        return files;
    } catch (error) {
        console.error(`[serializeFiles] Error during serialization:`, error);
        throw error;
    }
}

async function getAllFilePathsFlat(rootDir: string): Promise<string[]> {
    const allPaths: string[] = [];
    const dirsToProcess = [rootDir];

    while (dirsToProcess.length > 0) {
        const currentDir = dirsToProcess.shift()!;
        try {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);

                if (entry.isDirectory()) {
                    if (!EXCLUDED_PUBLISH_DIRECTORIES.includes(entry.name)) {
                        dirsToProcess.push(fullPath);
                    }
                } else if (entry.isFile()) {
                    allPaths.push(fullPath);
                }
            }
        } catch (error) {
            console.warn(`[getAllFilePathsFlat] Error reading directory ${currentDir}:`, error);
        }
    }

    return allPaths;
}

function shouldSkipFile(filePath: string): boolean {
    return filePath.includes('node_modules') ||
        filePath.includes('.git/') ||
        filePath.includes('/.next/') ||
        filePath.includes('/dist/') ||
        filePath.includes('/build/') ||
        filePath.includes('/coverage/');
}

function categorizeFiles(filePaths: string[]): { binaryFiles: string[], textFiles: string[] } {
    const binaryFiles: string[] = [];
    const textFiles: string[] = [];

    for (const filePath of filePaths) {
        const fileName = path.basename(filePath);
        if (isBinaryFile(fileName)) {
            binaryFiles.push(filePath);
        } else {
            textFiles.push(filePath);
        }
    }

    return { binaryFiles, textFiles };
}

async function processTextFilesBatch(filePaths: string[], baseDir: string): Promise<Record<string, FreestyleFile>> {
    const promises = filePaths.map(async (fullPath) => {
        const relativePath = path.relative(baseDir, fullPath);

        try {
            const textContent = await fs.readFile(fullPath, 'utf-8');

            return {
                path: relativePath,
                file: {
                    content: textContent,
                    encoding: 'utf-8' as const,
                }
            };
        } catch (error) {
            console.warn(`[processTextFilesBatch] Error processing ${relativePath}:`, error);
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

async function processBinaryFilesBatch(filePaths: string[], baseDir: string): Promise<Record<string, FreestyleFile>> {
    const promises = filePaths.map(async (fullPath) => {
        const relativePath = path.relative(baseDir, fullPath);

        try {
            const binaryContent = await fs.readFile(fullPath);
            const base64String = binaryContent.toString('base64');

            return {
                path: relativePath,
                file: {
                    content: base64String,
                    encoding: 'base64' as const,
                }
            };
        } catch (error) {
            console.warn(`[processBinaryFilesBatch] Error processing ${relativePath}:`, error);
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

async function deployWeb(
    type: PublishType,
    projectId: string,
    files: Record<string, FreestyleFile>,
    urls: string[],
    envVars: Record<string, string> | undefined,
    db: any
): Promise<boolean> {
    try {
        // Verify domain ownership
        if (type === PublishType.PREVIEW) {
            const preview = await db.query.previewDomains.findFirst({
                where: and(
                    eq(previewDomains.projectId, projectId),
                    inArray(previewDomains.fullDomain, urls),
                ),
            });
            if (!preview) {
                throw new Error('No preview domain found');
            }
        } else if (type === PublishType.CUSTOM) {
            const custom = await db.query.publishedDomains.findFirst({
                where: and(
                    eq(publishedDomains.projectId, projectId),
                    inArray(publishedDomains.fullDomain, urls),
                ),
            });
            if (!custom) {
                throw new Error('No custom domain found');
            }
        }

        const adapter = HostingProviderFactory.create(HostingProvider.FREESTYLE);

        const deploymentFiles: Record<string, { content: string; encoding?: 'utf-8' | 'base64' }> = {};
        for (const [path, file] of Object.entries(files)) {
            deploymentFiles[path] = {
                content: file.content,
                encoding: file.encoding as 'utf-8' | 'base64' | undefined,
            };
        }

        const result = await adapter.deploy({
            files: deploymentFiles,
            domains: urls,
            entrypoint: 'server.js',
            envVars,
        });

        if (!result.success) {
            throw new Error(result.error || 'Deployment failed');
        }

        // Update the publish timestamp
        if (type === PublishType.PREVIEW) {
            await db.update(previewDomains)
                .set({ updatedAt: new Date() })
                .where(and(
                    eq(previewDomains.projectId, projectId),
                    inArray(previewDomains.fullDomain, urls),
                ));
        } else if (type === PublishType.CUSTOM) {
            await db.update(publishedDomains)
                .set({ updatedAt: new Date() })
                .where(and(
                    eq(publishedDomains.projectId, projectId),
                    inArray(publishedDomains.fullDomain, urls),
                ));
        }

        return true;
    } catch (error) {
        console.error('Failed to deploy project:', error);
        return false;
    }
}