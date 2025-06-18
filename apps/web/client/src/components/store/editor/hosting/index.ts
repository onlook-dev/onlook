import { api } from '@/trpc/client';
import { CUSTOM_OUTPUT_DIR, DefaultSettings, SUPPORTED_LOCK_FILES } from '@onlook/constants';
import { addBuiltWithScript, injectBuiltWithScript, removeBuiltWithScript, removeBuiltWithScriptFromLayout } from '@onlook/growth';
import {
    PublishStatus,
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

    async publish(projectId: string, { buildScript, urls, options }: PublishRequest): Promise<PublishResponse> {
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
            this.updateState({ status: PublishStatus.LOADING, message: 'Creating optimized build...', progress: 20 });
            await this.runBuildStep(buildScript, options);
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
            const id = await this.deployWeb(projectId, files, urls, options?.envVars);

            if (!options?.skipBadge) {
                await this.removeBadge('./');
                timer.log('"Built with Onlook" badge removed');
                this.updateState({ status: PublishStatus.LOADING, message: 'Cleaning up...', progress: 90 });
            }

            timer.log('Deployment completed');
            this.updateState({ status: PublishStatus.PUBLISHED, message: 'Deployment successful, deployment ID: ' + id, progress: 100 });

            return {
                success: true,
                message: 'Deployment successful, deployment ID: ' + id,
            };
        } catch (error) {
            console.error('Failed to deploy to preview environment', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async unpublish(projectId: string, urls: string[]): Promise<PublishResponse> {
        try {
            const id = await this.deployWeb(projectId, {}, urls);
            return {
                success: true,
                message: 'Deployment deleted with ID: ' + id,
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
        projectId: string,
        files: Record<string, FreestyleFile>,
        urls: string[],
        envVars?: Record<string, string>,
    ): Promise<string> {
        const deploymentId = await api.domain.preview.publish.mutate({
            projectId,
            files: files,
            config: {
                domains: urls,
                entrypoint: 'server.js',
                envVars,
            },
        });

        return deploymentId;
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
     * Serializes all files in a directory for deployment
     * @param currentDir - The directory path to serialize
     * @param basePath - The base path for relative file paths (used for recursion)
     * @returns Record of file paths to their content (base64 for binary, utf-8 for text)
     */
    private async serializeFiles(
        currentDir: string,
        basePath: string = '',
    ): Promise<Record<string, FreestyleFile>> {
        const files: Record<string, FreestyleFile> = {};

        if (!this.editorEngine.sandbox.session.session) {
            throw new Error('No sandbox session available');
        }

        try {
            const entries = await this.editorEngine.sandbox.session.session.fs.readdir(currentDir);

            for (const entry of entries) {
                const entryPath = `${currentDir}/${entry.name}`;

                // Skip node_modules directory
                if (entryPath.includes('node_modules')) {
                    continue;
                }

                if (entry.type === 'directory') {
                    // Recursively process subdirectories
                    const subFiles = await this.serializeFiles(
                        entryPath,
                        `${basePath}${entry.name}/`,
                    );
                    Object.assign(files, subFiles);
                } else if (entry.type === 'file') {
                    const filePath = `${basePath}${entry.name}`;

                    if (isBinaryFile(entry.name)) {
                        // Read binary file and encode as base64
                        const binaryContent =
                            await this.editorEngine.sandbox.readBinaryFile(entryPath);
                        if (binaryContent) {
                            // Convert Uint8Array to base64 string
                            const base64String = btoa(
                                Array.from(binaryContent)
                                    .map((byte: number) => String.fromCharCode(byte))
                                    .join(''),
                            );
                            files[filePath] = {
                                content: base64String,
                                encoding: 'base64',
                            };
                        }
                    } else {
                        // Read text file
                        const textContent = await this.editorEngine.sandbox.readFile(entryPath);
                        if (textContent !== null) {
                            files[filePath] = {
                                content: textContent,
                                encoding: 'utf-8',
                            };
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error serializing files in directory ${currentDir}:`, error);
            throw error;
        }

        return files;
    }
}
