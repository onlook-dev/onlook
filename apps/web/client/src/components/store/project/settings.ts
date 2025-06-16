import { api } from '@/trpc/client';
import { makeAutoObservable } from 'mobx';
import type { ProjectManager } from './manager';
import type { ProjectSettings } from '@onlook/models';
import { fromProjectSettings } from '@onlook/db';

export class ProjectSettingsManager {
    settings: ProjectSettings | null = null;

    constructor(private projectManager: ProjectManager) {
        makeAutoObservable(this);
        this.restoreSettings();
    }

    async restoreSettings() {
        const project = this.projectManager.project;
        if (!project) {
            console.warn('Cannot restore settings: No project found');
            return;
        }
        const settings = await api.settings.get.query({ projectId: project.id });
        if (settings) {
            this.settings = settings;
        }
    }

    async update(newSettings: Partial<ProjectSettings>) {
        const project = this.projectManager.project;
        if (!project) {
            console.error('Cannot update settings: No project found');
            return;
        }

        if (!this.settings) {
            console.error('Cannot update settings: No settings found');
            return;
        }

        this.settings = {
            ...this.settings,
            ...newSettings,
        };

        await api.settings.update.mutate({
            ...fromProjectSettings(this.settings),
            projectId: project.id,
        });
    }
}
