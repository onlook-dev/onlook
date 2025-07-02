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
    private currentPublishId: string | null = null;
    private pollingInterval: ReturnType<typeof setInterval> | null = null;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    private updateState(state: Partial<PublishState>) {
        this.state = {
            ...this.state,
            ...state,
        };
    }

    resetState() {
        this.state = DEFAULT_PUBLISH_STATE;
        this.stopPolling();
    }

    private stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.currentPublishId = null;
    }

    private async pollPublishState(publishId: string): Promise<void> {
        try {
            const state = await api.domain.publish.getPublishState.query({ publishId });
            this.updateState(state);

            // Stop polling if finished
            if (state.status === PublishStatus.PUBLISHED || state.status === PublishStatus.ERROR) {
                this.stopPolling();
            }
        } catch (error) {
            console.error('Error polling publish state:', error);
            this.updateState({
                status: PublishStatus.ERROR,
                message: 'Failed to get deployment status',
                error: error instanceof Error ? error.message : 'Unknown error',
                progress: 100,
            });
            this.stopPolling();
        }
    }

    async publishPreview(projectId: string, { buildScript, urls, options }: PublishRequest): Promise<PublishResponse> {
        return this.publish(PublishType.PREVIEW, projectId, { buildScript, urls, options });
    }

    async publishCustom(projectId: string, { buildScript, urls, options }: PublishRequest): Promise<PublishResponse> {
        return this.publish(PublishType.CUSTOM, projectId, { buildScript, urls, options });
    }

    private async publish(type: PublishType, projectId: string, request: PublishRequest): Promise<PublishResponse> {
        try {
            this.stopPolling(); // Stop any existing polling
            
            // Get the project path
            const projectPath = this.editorEngine.manager.project?.folderPath;
            if (!projectPath) {
                throw new Error('Project path not found');
            }

            // Start the publish process on the server
            const { publishId } = await api.domain.publish.startPublish.mutate({
                type: type === PublishType.CUSTOM ? 'custom' : 'preview',
                projectId,
                projectPath,
                request,
            });

            this.currentPublishId = publishId;

            // Start polling for progress
            this.pollingInterval = setInterval(async () => {
                await this.pollPublishState(publishId);
            }, 1000); // Poll every second

            // Initial poll
            await this.pollPublishState(publishId);

            // Wait for completion (with timeout)
            const timeout = 600000; // 10 minutes timeout
            const startTime = Date.now();

            while (this.state.status === PublishStatus.LOADING) {
                if (Date.now() - startTime > timeout) {
                    throw new Error('Deployment timed out');
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            return {
                success: this.state.status === PublishStatus.PUBLISHED,
                message: this.state.message || 'Deployment completed',
            };

        } catch (error) {
            console.error('Failed to deploy:', error);
            this.updateState({ 
                status: PublishStatus.ERROR, 
                message: 'Failed to deploy to environment', 
                progress: 100 
            });
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        } finally {
            this.stopPolling();
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

    // The following methods are no longer needed as they're handled server-side
    // but kept for compatibility if needed
    
    private get fileOps(): FileOperations {
        return {
            readFile: (path: string) => this.editorEngine.sandbox.readFile(path),
            writeFile: (path: string, content: string) => this.editorEngine.sandbox.writeFile(path, content),
            fileExists: (path: string) => this.editorEngine.sandbox.fileExists(path),
            copy: (source: string, destination: string, recursive?: boolean, overwrite?: boolean) => this.editorEngine.sandbox.copy(source, destination, recursive, overwrite),
            delete: (path: string, recursive?: boolean) => this.editorEngine.sandbox.delete(path, recursive),
        };
    }
}
