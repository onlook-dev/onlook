import { api } from '@/trpc/client';
import { CUSTOM_OUTPUT_DIR, DefaultSettings, EXCLUDED_PUBLISH_DIRECTORIES, SUPPORTED_LOCK_FILES } from '@onlook/constants';
import { addBuiltWithScript, injectBuiltWithScript, removeBuiltWithScript, removeBuiltWithScriptFromLayout } from '@onlook/growth';
import {
    PublishStatus,
    type DeploymentResponse,
    type PublishOptions,
    type PublishRequest,
    type PublishResponse,
    type PublishState,
} from '@onlook/models';
import { addNextBuildConfig } from '@onlook/parser';
import { isBinaryFile, isEmptyString, isNullOrUndefined, LogTimer, updateGitignore, type FileOperations } from '@onlook/utility';
import {
    type FreestyleFile,
} from 'freestyle-sandboxes';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

const DEFAULT_PUBLISH_STATE: PublishState = {
    status: PublishStatus.UNPUBLISHED,
    message: null,
    buildLog: null,
    error: null,
    progress: null,
};

enum PublishType {
    CUSTOM = 'custom',
    PREVIEW = 'preview',
    UNPUBLISH = 'unpublish',
}

export class HostingManager {
    state: PublishState = DEFAULT_PUBLISH_STATE;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    private get fileOps(): FileOperations {
        return {
            readFile: (path: string) => this.editorEngine.sandbox.readFile(path),
            writeFile: (path: string, content: string) => this.editorEngine.sandbox.writeFile(path, content),
            fileExists: (path: string) => this.editorEngine.sandbox.fileExists(path),
            copy: (source: string, destination: string, recursive?: boolean, overwrite?: boolean) => this.editorEngine.sandbox.copy(source, destination, recursive, overwrite),
            delete: (path: string, recursive?: boolean) => this.editorEngine.sandbox.delete(path, recursive),
        };
    }

    private updateState(state: Partial<PublishState>) {
        this.state = {
            ...this.state,
            ...state,
        };
    }

    resetState() {
        this.state = DEFAULT_PUBLISH_STATE
    }

    async publishPreview(projectId: string, { buildScript, urls, options }: PublishRequest): Promise<PublishResponse> {
        return this.publish(PublishType.PREVIEW, projectId, { buildScript, urls, options });
    }

    async publishCustom(projectId: string, { buildScript, urls, options }: PublishRequest): Promise<PublishResponse> {
        return this.publish(PublishType.CUSTOM, projectId, { buildScript, urls, options });
    }

    private async publish(type: PublishType, projectId: string, { buildScript, urls, options }: PublishRequest): Promise<PublishResponse> {
        try {
            const timer = new LogTimer('Deployment');

            this.updateState({ status: PublishStatus.LOADING, message: 'Preparing project...', progress: 5 });
            await this.runPrepareStep();
            timer.log('Prepare completed');

            if (!options?.skipBadge) {
                this.updateState({ status: PublishStatus.LOADING, message: 'Adding badge...', progress: 10 });
                await this.addBadge('./');
                timer.log('"Built with Onlook" badge added');
            }

            // Run the build script
            if (!options?.skipBuild) {
                this.updateState({ status: PublishStatus.LOADING, message: 'Creating optimized build...', progress: 20 });
                await this.runBuildStep(buildScript, options);
            } else {
                console.log('Skipping build');
            }
            timer.log('Build completed');
            this.updateState({ status: PublishStatus.LOADING, message: 'Preparing project for deployment...', progress: 60 });

            // Postprocess the project for deployment
            const { success: postprocessSuccess, error: postprocessError } =
                await this.postprocessNextBuild();
            timer.log('Postprocess completed');

            if (!postprocessSuccess) {
                throw new Error(
                    `Failed to postprocess project for deployment, error: ${postprocessError}`,
                );
            }

            // Serialize the files for deployment
            const NEXT_BUILD_OUTPUT_PATH = `${CUSTOM_OUTPUT_DIR}/standalone`;
            const files = await this.serializeFiles(NEXT_BUILD_OUTPUT_PATH);

            this.updateState({ status: PublishStatus.LOADING, message: 'Deploying project...', progress: 80 });

            timer.log('Files serialized, sending to Freestyle...');
            const success = await this.deployWeb(type, projectId, files, urls, options?.envVars);

            if (!success) {
                throw new Error('Failed to deploy project');
            }

            if (!options?.skipBadge) {
                await this.removeBadge('./');
                timer.log('"Built with Onlook" badge removed');
                this.updateState({ status: PublishStatus.LOADING, message: 'Cleaning up...', progress: 90 });
            }

            timer.log('Deployment completed');
            this.updateState({ status: PublishStatus.PUBLISHED, message: 'Deployment successful', progress: 100 });

            return {
                success: true,
                message: 'Deployment successful',
            };
        } catch (error) {
            console.error('Failed to deploy to preview environment', error);
            this.updateState({ status: PublishStatus.ERROR, message: 'Failed to deploy to preview environment', progress: 100 });
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async unpublish(projectId: string, urls: string[]): Promise<PublishResponse> {
        try {
            const success = await this.deployWeb(PublishType.UNPUBLISH, projectId, {}, urls);

            if (!success) {
                throw new Error('Failed to delete deployment');
            }

            return {
                success: true,
                message: 'Deployment deleted',
            };
        } catch (error) {
            console.error('Failed to delete deployment', error);
            return {
                success: false,
                message: 'Failed to delete deployment. ' + error,
            };
        }
    }

    private async addBadge(folderPath: string) {
        await injectBuiltWithScript(folderPath, this.fileOps);
        await addBuiltWithScript(folderPath, this.fileOps);
    }

    private async removeBadge(folderPath: string) {
        await removeBuiltWithScriptFromLayout(folderPath, this.fileOps);
        await removeBuiltWithScript(folderPath, this.fileOps);
    }

    private async deployWeb(
        type: PublishType,
        projectId: string,
        files: Record<string, FreestyleFile>,
        urls: string[],
        envVars?: Record<string, string>,
    ): Promise<boolean> {
        try {
            const res: DeploymentResponse = await api.domain.preview.publish.mutate({
                projectId,
                files: files,
                type: type === PublishType.CUSTOM ? 'custom' : 'preview',
                config: {
                    domains: urls,
                    entrypoint: 'server.js',
                    envVars,
                },
            });
            return res.success;
        } catch (error) {
            console.error('Failed to deploy project', error);
            return false;
        }
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

    private async runBuildStep(buildScript: string, options?: PublishOptions) {
        // Use default build flags if no build flags are provided
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

        const {
            success: buildSuccess,
            error: buildError,
            output: buildOutput,
        } = await this.editorEngine.sandbox.session.runCommand(BUILD_SCRIPT_NO_LINT, (output: string) => {
            console.log('Build output: ', output);
        });

        if (!buildSuccess) {
            throw new Error(`Build failed with error: ${buildError}`);
        } else {
            console.log('Build succeeded with output: ', buildOutput);
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
     * Serializes all files in a directory for deployment using parallel processing
     * @param currentDir - The directory path to serialize
     * @returns Record of file paths to their content (base64 for binary, utf-8 for text)
     */
    private async serializeFiles(currentDir: string): Promise<Record<string, FreestyleFile>> {
        const timer = new LogTimer('File Serialization');

        if (!this.editorEngine.sandbox.session.session) {
            throw new Error('No sandbox session available');
        }

        try {
            const allFilePaths = await this.getAllFilePathsFlat(currentDir);
            timer.log(`File discovery completed - ${allFilePaths.length} files found`);

            const filteredPaths = allFilePaths.filter(filePath => !this.shouldSkipFile(filePath));

            const { binaryFiles, textFiles } = this.categorizeFiles(filteredPaths);

            const BATCH_SIZE = 50;
            const files: Record<string, FreestyleFile> = {};

            if (textFiles.length > 0) {
                timer.log(`Processing ${textFiles.length} text files in batches of ${BATCH_SIZE}`);
                for (let i = 0; i < textFiles.length; i += BATCH_SIZE) {
                    const batch = textFiles.slice(i, i + BATCH_SIZE);
                    const batchFiles = await this.processTextFilesBatch(batch, currentDir);
                    Object.assign(files, batchFiles);
                }
                timer.log('Text files processing completed');
            }

            if (binaryFiles.length > 0) {
                timer.log(`Processing ${binaryFiles.length} binary files in batches of ${BATCH_SIZE}`);
                for (let i = 0; i < binaryFiles.length; i += BATCH_SIZE) {
                    const batch = binaryFiles.slice(i, i + BATCH_SIZE);
                    const batchFiles = await this.processBinaryFilesBatch(batch, currentDir);
                    Object.assign(files, batchFiles);
                }
                timer.log('Binary files processing completed');
            }

            timer.log(`Serialization completed - ${Object.keys(files).length} files processed`);
            return files;
        } catch (error) {
            console.error(`[serializeFiles] Error during serialization:`, error);
            throw error;
        }
    }

    private async getAllFilePathsFlat(rootDir: string): Promise<string[]> {
        const allPaths: string[] = [];
        const dirsToProcess = [rootDir];

        while (dirsToProcess.length > 0) {
            const currentDir = dirsToProcess.shift()!;
            try {
                const entries = await this.editorEngine.sandbox.session.session!.fs.readdir(currentDir);

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
            filePath.includes('/coverage/');
    }

    private categorizeFiles(filePaths: string[]): { binaryFiles: string[], textFiles: string[] } {
        const binaryFiles: string[] = [];
        const textFiles: string[] = [];

        for (const filePath of filePaths) {
            const fileName = filePath.split('/').pop() || '';
            if (isBinaryFile(fileName)) {
                binaryFiles.push(filePath);
            } else {
                textFiles.push(filePath);
            }
        }

        return { binaryFiles, textFiles };
    }


    private async processTextFilesBatch(filePaths: string[], baseDir: string): Promise<Record<string, FreestyleFile>> {
        const promises = filePaths.map(async (fullPath) => {
            const relativePath = fullPath.replace(baseDir + '/', '');

            try {
                const textContent = await this.editorEngine.sandbox.readFile(fullPath);

                if (textContent !== null) {
                    return {
                        path: relativePath,
                        file: {
                            content: textContent,
                            encoding: 'utf-8' as const,
                        }
                    };
                } else {
                    console.warn(`[processTextFilesBatch] Failed to read text content for ${relativePath}`);
                    return null;
                }
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

    private async processBinaryFilesBatch(filePaths: string[], baseDir: string): Promise<Record<string, FreestyleFile>> {
        const promises = filePaths.map(async (fullPath) => {
            const relativePath = fullPath.replace(baseDir + '/', '');

            try {
                const binaryContent = await this.editorEngine.sandbox.readBinaryFile(fullPath);

                if (binaryContent) {
                    const base64String = btoa(
                        Array.from(binaryContent)
                            .map((byte: number) => String.fromCharCode(byte))
                            .join(''),
                    );

                    return {
                        path: relativePath,
                        file: {
                            content: base64String,
                            encoding: 'base64' as const,
                        }
                    };
                } else {
                    console.warn(`[processBinaryFilesBatch] Failed to read binary content for ${relativePath}`);
                    return null;
                }
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
}
