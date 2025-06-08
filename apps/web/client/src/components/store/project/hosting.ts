import { api } from '@/trpc/client';
import { createClient } from '@/utils/supabase/client';
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
import { isBinaryFile, isEmptyString, isNullOrUndefined, updateGitignore, type FileOperations } from '@onlook/utility';
import {
    type FreestyleFile,
} from 'freestyle-sandboxes';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../editor/engine';

const DEFAULT_STATE: PublishState = {
    status: PublishStatus.UNPUBLISHED,
    message: null,
};

export class HostingManager {
    state: PublishState = DEFAULT_STATE;
    readonly supabase = createClient();
    private editorEngine: EditorEngine;

    constructor(editorEngine: EditorEngine) {
        this.editorEngine = editorEngine;
        makeAutoObservable(this);
    }

    private updateState(partialState: Partial<PublishState>) {
        this.state = { ...this.state, ...partialState };
    }

    private get fileOps(): FileOperations {
        return {
            readFile: (path: string) => this.editorEngine.sandbox.readFile(path),
            writeFile: (path: string, content: string) => this.editorEngine.sandbox.writeFile(path, content),
            fileExists: (path: string) => this.editorEngine.sandbox.fileExists(path),
            copyDir: (source: string, destination: string) => this.editorEngine.sandbox.copyDir(source, destination),
            copyFile: (source: string, destination: string) => this.editorEngine.sandbox.copyFile(source, destination),
            deleteFile: async (path: string) => this.editorEngine.sandbox.deleteFile(path),
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

    async publish({ buildScript, urls, options }: PublishRequest): Promise<PublishResponse> {
        try {
            const timer = new LogTimer('Deployment');
            this.emitState(PublishStatus.LOADING, 'Preparing project...');

            await this.runPrepareStep();
            timer.log('Prepare completed');
            this.emitState(PublishStatus.LOADING, 'Creating optimized build...');

            if (!options?.skipBadge) {
                this.emitState(PublishStatus.LOADING, 'Adding badge...');
                await this.addBadge('./');
                timer.log('"Built with Onlook" badge added');
            }

            // Run the build script
            await this.runBuildStep(buildScript, options);
            timer.log('Build completed');
            this.emitState(PublishStatus.LOADING, 'Preparing project for deployment...');

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
            this.emitState(PublishStatus.LOADING, 'Deploying project...');
            timer.log('Files serialized, sending to Freestyle...');

            const id = await this.deployWeb(files, urls, options?.envVars);
            timer.log('Deployment completed');

            this.emitState(PublishStatus.PUBLISHED, 'Deployment successful, deployment ID: ' + id);

            if (!options?.skipBadge) {
                await this.removeBadge('./');
                timer.log('"Built with Onlook" badge removed');
            }

            return {
                success: true,
                message: 'Deployment successful, deployment ID: ' + id,
            };
        } catch (error) {
            console.error('Failed to deploy to preview environment', error);
            this.emitState(PublishStatus.ERROR, 'Deployment failed with error: ' + error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async unpublish(urls: string[]): Promise<PublishResponse> {
        try {
            const id = await this.deployWeb({}, urls);
            this.emitState(PublishStatus.UNPUBLISHED, 'Deployment deleted with ID: ' + id);

            return {
                success: true,
                message: 'Deployment deleted with ID: ' + id,
            };
        } catch (error) {
            console.error('Failed to delete deployment', error);
            this.emitState(PublishStatus.ERROR, 'Failed to delete deployment');

            return {
                success: false,
                message: 'Failed to delete deployment. ' + error,
            };
        }
    }

    async addBadge(folderPath: string) {
        await injectBuiltWithScript(folderPath, this.fileOps);
        await addBuiltWithScript(folderPath, this.fileOps);
    }

    async removeBadge(folderPath: string) {
        await removeBuiltWithScriptFromLayout(folderPath, this.fileOps);
        await removeBuiltWithScript(folderPath, this.fileOps);
    }


    async deployWeb(
        files: Record<string, FreestyleFile>,
        urls: string[],
        envVars?: Record<string, string>,
    ): Promise<string> {
        // TODO: Verify domain ownership
        // const ownedDomains = await this.getOwnedDomains();
        // const domainOwnership = verifyDomainOwnership(urls, ownedDomains, HOSTING_DOMAIN);
        // if (!domainOwnership) {
        //     throw new Error('Failed to verify domain ownership');
        // }

        const deploymentId = await api.domain.publish.mutate({
            files: files,
            config: {
                domains: urls,
                entrypoint: 'server.js',
                envVars,
            },
        });

        return deploymentId;
    }

    async runPrepareStep() {
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

    async runBuildStep(buildScript: string, options?: PublishOptions) {
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
            this.emitState(PublishStatus.ERROR, `Build failed with error: ${buildError}`);
            throw new Error(`Build failed with error: ${buildError}`);
        } else {
            console.log('Build succeeded with output: ', buildOutput);
        }
    }

    async postprocessNextBuild(): Promise<{
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

        // Check if copyDir method is available before using it
        if (this.fileOps.copyDir) {
            this.fileOps.copyDir(`public`, `${CUSTOM_OUTPUT_DIR}/standalone/public`);
            this.fileOps.copyDir(
                `${CUSTOM_OUTPUT_DIR}/static`,
                `${CUSTOM_OUTPUT_DIR}/standalone/${CUSTOM_OUTPUT_DIR}/static`,
            );
        } else {
            console.warn('copyDir method not available in file operations');
        }

        for (const lockFile of SUPPORTED_LOCK_FILES) {
            const lockFileExists = await this.fileOps.fileExists(`./${lockFile}`);
            if (lockFileExists) {
                // Check if copyFile method is available before using it
                if (this.fileOps.copyFile) {
                    this.fileOps.copyFile(
                        `./${lockFile}`,
                        `${CUSTOM_OUTPUT_DIR}/standalone/${lockFile}`,
                    );
                    return { success: true };
                } else {
                    console.warn('copyFile method not available in file operations');
                    return {
                        success: false,
                        error: 'Copy operations not supported by file operations interface',
                    };
                }
            }
        }

        return {
            success: false,
            error:
                'Failed to find lock file. Supported lock files: ' +
                SUPPORTED_LOCK_FILES.join(', '),
        };
    }

    async getOwnedDomains(): Promise<string[]> {
        const { data, error } = await this.supabase.from('domains').select('domain');
        if (error) {
            console.error(`Failed to get owned domains: ${error}`);
            return [];
        }
        return data.map((domain: { domain: string }) => domain.domain);
    }

    emitState(status: PublishStatus, message: string) {
        console.log(`Deployment state: ${status} - ${message}`);
        this.updateState({
            status,
            message,
        });
    }
}

class LogTimer {
    private startTime: number;
    private name: string;

    constructor(name: string) {
        this.startTime = Date.now();
        this.name = name;
    }

    log(step: string) {
        const elapsed = Date.now() - this.startTime;
        console.log(`[${this.name}] ${step}: ${elapsed}ms`);
    }
}
