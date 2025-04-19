import { makeAutoObservable } from 'mobx';
import { MainChannels } from '@onlook/models/constants';
import type { ProjectsManager } from '.';
import { toast } from '@onlook/ui/use-toast';
import { invokeMainChannel } from '../utils';
import { CopyStage, RunState } from '@onlook/models';

export class CopyManager {
    copyStage: CopyStage = CopyStage.STARTING;
    progress: number = 0;
    message: string = '';
    error: string | null = null;
    private cleanupListener: (() => void) | null = null;
    private slowConnectionTimer: ReturnType<typeof setTimeout> | null = null;
    constructor(private projectsManager: ProjectsManager) {
        makeAutoObservable(this);
        this.listenForPromptProgress();
    }

    get copyState() {
        return this.copyStage;
    }

    async createCopy(updatedPath: string) {
        try {
            const currentPath = this.projectsManager.project?.folderPath ?? '';
            if (!currentPath) {
                toast({
                    title: 'Error',
                    description: 'No valid path found',
                    variant: 'destructive',
                });
                return;
            }

            if (this.projectsManager.runner?.state === RunState.RUNNING) {
                await this.projectsManager.runner?.stop();
            }

            await invokeMainChannel(MainChannels.UPDATE_PROJECT_PATH, {
                currentPath,
                updatedPath,
            });

            this.projectsManager.updatePartialProject({
                folderPath: updatedPath,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No valid path found',
                variant: 'destructive',
            });
            console.error(error);
            throw error;
        }
    }

    listenForPromptProgress() {
        window.api.on(
            MainChannels.COPY_PROJECT_CALLBACK,
            ({ message, stage }: { message: string; stage: CopyStage }) => {
                this.copyStage = stage;
                this.message = message;
            },
        );

        this.cleanupListener = () => {
            window.api.removeAllListeners(MainChannels.COPY_PROJECT_CALLBACK);
        };

        return this.cleanupListener;
    }
}
