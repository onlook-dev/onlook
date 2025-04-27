import { makeAutoObservable } from 'mobx';
import { MainChannels } from '@onlook/models/constants';
import type { ProjectsManager } from '.';
import { invokeMainChannel } from '../utils';
import { CopyStage, RunState } from '@onlook/models';

export class CopyManager {
    copyStage: CopyStage = CopyStage.STARTING;
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

    async createCopy(updatedPath: string): Promise<void> {
        try {
            const currentPath = this.projectsManager.project?.folderPath ?? '';
            if (!currentPath) {
                throw Error('Valid current path not found');
            }

            await invokeMainChannel(MainChannels.UPDATE_PROJECT_PATH, {
                currentPath,
                updatedPath,
            });
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    listenForPromptProgress() {
        window.api.on(MainChannels.COPY_PROJECT_CALLBACK, ({ stage }: { stage: CopyStage }) => {
            this.copyStage = stage;
        });

        this.cleanupListener = () => {
            window.api.removeAllListeners(MainChannels.COPY_PROJECT_CALLBACK);
        };

        return this.cleanupListener;
    }
}
