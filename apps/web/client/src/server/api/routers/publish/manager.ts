import { WebSocketSession } from '@codesandbox/sdk';
import { CUSTOM_OUTPUT_DIR, DefaultSettings, EXCLUDED_PUBLISH_DIRECTORIES, SUPPORTED_LOCK_FILES } from '@onlook/constants';
import { addBuiltWithScript, injectBuiltWithScript } from '@onlook/growth';
import {
    DeploymentStatus,
    type DeploymentState
} from '@onlook/models';
import { addNextBuildConfig } from '@onlook/parser';
import { isBinaryFile, isEmptyString, isNullOrUndefined, LogTimer, updateGitignore, type FileOperations } from '@onlook/utility';
import {
    type FreestyleFile,
} from 'freestyle-sandboxes';

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
                const stat = await this.session.fs.stat(path);
                return stat.type === 'file';
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

    private updateState(state: Partial<DeploymentState>) {
        console.log('Update state', state);
    }

    async publish({
        buildScript,
        skipBadge,
        skipBuild,
        buildFlags,
        envVars,
    }: {
        buildScript: string,
        buildFlags: string;
        skipBadge: boolean;
        skipBuild: boolean;
        envVars: Record<string, string>;
    }): Promise<{
        success: boolean,
        files: Record<string, FreestyleFile>,
    }> {
        try {

            this.updateState({ status: DeploymentStatus.LOADING, message: 'Preparing project...', progress: 5 });
            await this.runPrepareStep();
            console.log('Prepare completed');

            if (!skipBadge) {
                this.updateState({ status: DeploymentStatus.LOADING, message: 'Adding badge...', progress: 10 });
                await this.addBadge('./');
                console.log('"Built with Onlook" badge added');
            }

            // Run the build script
            this.updateState({ status: DeploymentStatus.LOADING, message: 'Creating optimized build...', progress: 20 });
            await this.runBuildStep(buildScript, skipBuild, buildFlags, envVars);

            console.log('Build completed');
            this.updateState({ status: DeploymentStatus.LOADING, message: 'Preparing project for deployment...', progress: 60 });

            // Postprocess the project for deployment
            const { success: postprocessSuccess, error: postprocessError } = await this.postprocessNextBuild();
            console.log('Postprocess completed');

            if (!postprocessSuccess) {
                throw new Error(
                    `Failed to postprocess project for deployment, error: ${postprocessError}`,
                );
            }

            // Serialize the files for deployment
            const NEXT_BUILD_OUTPUT_PATH = `${CUSTOM_OUTPUT_DIR}/standalone`;
            const files = await this.serializeFiles(NEXT_BUILD_OUTPUT_PATH);

            this.updateState({ status: DeploymentStatus.LOADING, message: 'Deploying project...', progress: 80 });
            console.log('Files serialized, sending to Freestyle...');

            return {
                success: true,
                files,
            };

        } catch (error) {
            console.error('Failed to deploy to preview environment', error);
            this.updateState({ status: DeploymentStatus.ERROR, message: 'Failed to deploy to preview environment', progress: 100 });
            return {
                success: false,
                files: {},
            };
        }
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

    private async runBuildStep(buildScript: string, skipBuild: boolean, buildFlags: string, envVars: Record<string, string>): Promise<void> {
        try {
            // Use default build flags if no build flags are provided
            const buildFlagsString: string = isNullOrUndefined(buildFlags)
                ? DefaultSettings.EDITOR_SETTINGS.buildFlags
                : buildFlags;

            const BUILD_SCRIPT_NO_LINT = isEmptyString(buildFlagsString)
                ? buildScript
                : `${buildScript} -- ${buildFlagsString}`;

            if (skipBuild) {
                console.log('Skipping build');
                return;
            }

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
     * Serializes all files in a directory for deployment using parallel processing
     * @param currentDir - The directory path to serialize
     * @returns Record of file paths to their content (base64 for binary, utf-8 for text)
     */
    private async serializeFiles(currentDir: string): Promise<Record<string, FreestyleFile>> {
        const timer = new LogTimer('File Serialization');

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
                const textContent = await this.session.fs.readTextFile(fullPath);

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
                const binaryContent = await this.session.fs.readFile(fullPath);

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
