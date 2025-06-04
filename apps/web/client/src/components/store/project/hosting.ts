import { makeAutoObservable } from 'mobx';
import {
    PublishStatus,
    type PublishOptions,
    type PublishRequest,
    type PublishResponse,
    type PublishState,
} from '@onlook/models';
import { isEmptyString, isNullOrUndefined } from '@onlook/utility';
import { CUSTOM_OUTPUT_DIR, DefaultSettings, HOSTING_DOMAIN } from '@onlook/constants';
import {
    FreestyleSandboxes,
    type FreestyleDeployWebConfiguration,
    type FreestyleDeployWebSuccessResponseV2,
    type FreestyleFile,
} from 'freestyle-sandboxes';
import { FUNCTIONS_ROUTE, BASE_API_ROUTE, ApiRoutes, HostingRoutes } from '@onlook/constants';
import type { EditorEngine } from '../editor/engine';
import { createClient } from '@/utils/supabase/client';
import { addNextBuildConfig } from '@onlook/foundation';

const DEFAULT_STATE: PublishState = {
    status: PublishStatus.UNPUBLISHED,
    message: null,
};

const SUPPORTED_LOCK_FILES = ['bun.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

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

    private get fileOps() {
        return {
            readFile: (path: string) => this.editorEngine.sandbox.readFile(path),
            writeFile: (path: string, content: string) => this.editorEngine.sandbox.writeFile(path, content),
            fileExists: (path: string) => this.editorEngine.sandbox.fileExists(path),
            copyDir: (source: string, destination: string) => this.editorEngine.sandbox.copyDir(source, destination),
            copyFile: (source: string, destination: string) => this.editorEngine.sandbox.copyFile(source, destination),
        };
    }

    /**
     * Check if a file is binary based on its extension
     */
    private isBinaryFile(filename: string): boolean {
        const binaryExtensions = [
            '.jpg',
            '.jpeg',
            '.png',
            '.gif',
            '.bmp',
            '.svg',
            '.ico',
            '.webp',
            '.pdf',
            '.zip',
            '.tar',
            '.gz',
            '.rar',
            '.7z',
            '.mp3',
            '.mp4',
            '.wav',
            '.avi',
            '.mov',
            '.wmv',
            '.exe',
            '.bin',
            '.dll',
            '.so',
            '.dylib',
            '.woff',
            '.woff2',
            '.ttf',
            '.eot',
            '.otf',
        ];

        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return binaryExtensions.includes(ext);
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

                    if (this.isBinaryFile(entry.name)) {
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
                // await this.addBadge();
                timer.log('"Built with Onlook" badge added');
            }

            console.log('runBuildStep');

            // Run the build script
            await this.runBuildStep(buildScript, options);
            timer.log('Build completed');
            this.emitState(PublishStatus.LOADING, 'Preparing project for deployment...');

            console.log('postprocessNextBuild');

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

            const id = await this.sendHostingPostRequest(files, urls, options?.envVars);
            timer.log('Deployment completed');  

            this.emitState(PublishStatus.PUBLISHED, 'Deployment successful, deployment ID: ' + id);

            if (!options?.skipBadge) {
                // await this.removeBadge(folderPath);
                timer.log('"Built with Onlook" badge removed');
            }

            return {
                success: true,
                message: 'Deployment successful, deployment ID: ' + id,
            };
        } catch (error) {
            console.error('Failed to deploy to preview environment', error);
            this.emitState(PublishStatus.ERROR, 'Deployment failed with error: ' + error);
            // analytics.trackError('Failed to deploy to preview environment', {
            //     error,
            // });
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async sendHostingPostRequest(
        files: Record<string, FreestyleFile>,
        urls: string[],
        envVars?: Record<string, string>,
    ): Promise<string> {
        const config: FreestyleDeployWebConfiguration = {
            domains: urls,
            entrypoint: 'server.js',
            envVars,
        };

        // Verify domain ownership
        const ownedDomains = await this.getOwnedDomains();
        const domainOwnership = await this.verifyDomainOwnership(urls, ownedDomains);
        if (!domainOwnership) {
            throw new Error('Failed to verify domain ownership');
        }
        // Refactor: TRPC call 
        const apiKey = process.env.FREESTYLE_API_KEY;
        if (!apiKey) {
            console.error('Freestyle API key not found.');
            throw new Error('Freestyle API key not found.');
        }
    
        const api = new FreestyleSandboxes({
            apiKey: apiKey,
        });
    
        const res = await api.deployWeb(
            { files, kind: 'files' },
            config
        );

        const freestyleResponse = (await res) as {
            message?: string;
            error?: {
                message: string;
            };
            data?: FreestyleDeployWebSuccessResponseV2;
        };

        if (!res) {
            console.log(JSON.stringify(freestyleResponse));
            throw new Error(
                `${freestyleResponse.error?.message || freestyleResponse.message || 'Unknown error'}`,
            );
        }

        return freestyleResponse.data?.deploymentId ?? '';
    }

    async runPrepareStep() {
        // Preprocess the project
        const preprocessSuccess = await addNextBuildConfig(this.fileOps);

        if (!preprocessSuccess) {
            throw new Error(`Failed to prepare project for deployment`);
        }

        // Update .gitignore to ignore the custom output directory
        const gitignoreSuccess = await this.updateGitignore(CUSTOM_OUTPUT_DIR);
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

        this.fileOps.copyDir(`/public`, `/${CUSTOM_OUTPUT_DIR}/standalone/public`);
        this.fileOps.copyDir(
            `/${CUSTOM_OUTPUT_DIR}/static`,
            `/${CUSTOM_OUTPUT_DIR}/standalone/${CUSTOM_OUTPUT_DIR}/static`,
        );

        for (const lockFile of SUPPORTED_LOCK_FILES) { 
            const lockFileExists = await this.fileOps.fileExists(`./${lockFile}`);
            if (lockFileExists) {
                this.fileOps.copyFile(
                    `./${lockFile}`,
                    `/${CUSTOM_OUTPUT_DIR}/standalone/${lockFile}`,
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
    async updateGitignore(target: string): Promise<boolean> {
        const gitignorePath = `/.gitignore`;

        try {
            // Check if .gitignore exists
            const gitignoreExists = await this.fileOps.fileExists(gitignorePath);

            if (!gitignoreExists) {
                // Create .gitignore with the target
                await this.fileOps.writeFile(gitignorePath, target + '\n');
                return true;
            }

            // Read existing .gitignore content
            const gitignoreContent = await this.fileOps.readFile(gitignorePath);
            if (gitignoreContent === null) {
                return false;
            }

            const lines = gitignoreContent.split(/\r?\n/);

            // Look for exact match of target
            if (!lines.some((line: string) => line.trim() === target)) {
                // Ensure there's a newline before adding if the file doesn't end with one
                const separator = gitignoreContent.endsWith('\n') ? '' : '\n';
                await this.fileOps.writeFile(
                    gitignorePath,
                    gitignoreContent + `${separator}${target}\n`,
                );
            }

            return true;
        } catch (error) {
            console.error(`Failed to update .gitignore: ${error}`);
            return false;
        }
    }

    async verifyDomainOwnership(requestDomains: string[], ownedDomains: string[]) {
        return requestDomains.every(requestDomain => {
            // Check if domain is directly owned
            if (ownedDomains.includes(requestDomain)) {
                return true;
            }
    
            // Check if www version of owned domain
            const withoutWww = requestDomain.replace(/^www\./, '');
            if (ownedDomains.includes(withoutWww)) {
                return true;
            }
    
            // Check if subdomain of HOSTING_DOMAIN
            if (requestDomain.endsWith(`.${HOSTING_DOMAIN}`)) {
                return true;
            }
    
            return false;
        });
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
