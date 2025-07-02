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
    private currentSubscription: { unsubscribe: () => void } | null = null;

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
        this.stopSubscription();
    }

    private stopSubscription() {
        if (this.currentSubscription) {
            this.currentSubscription.unsubscribe();
            this.currentSubscription = null;
        }
    }

    async publishPreview(projectId: string, { buildScript, urls, options }: PublishRequest): Promise<PublishResponse> {
        return this.publish(PublishType.PREVIEW, projectId, { buildScript, urls, options });
    }

    async publishCustom(projectId: string, { buildScript, urls, options }: PublishRequest): Promise<PublishResponse> {
        return this.publish(PublishType.CUSTOM, projectId, { buildScript, urls, options });
    }

    private async publish(type: PublishType, projectId: string, request: PublishRequest): Promise<PublishResponse> {
        return new Promise((resolve) => {
            try {
                this.stopSubscription(); // Stop any existing subscription
                
                // Get the project path
                const projectPath = this.editorEngine.manager.project?.folderPath;
                if (!projectPath) {
                    throw new Error('Project path not found');
                }

                // Subscribe to the publish process
                this.currentSubscription = api.domain.publish.publish.subscribe(
                    {
                        type: type === PublishType.CUSTOM ? 'custom' : 'preview',
                        projectId,
                        projectPath,
                        request,
                    },
                    {
                        onData: (state: PublishState) => {
                            this.updateState(state);
                            
                            // Resolve promise when finished
                            if (state.status === PublishStatus.PUBLISHED) {
                                resolve({
                                    success: true,
                                    message: state.message || 'Deployment successful',
                                });
                                this.stopSubscription();
                            } else if (state.status === PublishStatus.ERROR) {
                                resolve({
                                    success: false,
                                    message: state.error || state.message || 'Deployment failed',
                                });
                                this.stopSubscription();
                            }
                        },
                        onError: (error: Error) => {
                            console.error('Subscription error:', error);
                            this.updateState({
                                status: PublishStatus.ERROR,
                                message: 'Failed to connect to deployment service',
                                error: error.message,
                                progress: 100,
                            });
                            resolve({
                                success: false,
                                message: error.message || 'Unknown error',
                            });
                            this.stopSubscription();
                        },
                    }
                );
            } catch (error) {
                console.error('Failed to start deployment:', error);
                this.updateState({ 
                    status: PublishStatus.ERROR, 
                    message: 'Failed to start deployment', 
                    progress: 100 
                });
                resolve({
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        });
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
        files: Record<string, any>,
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
