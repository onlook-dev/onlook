import { makeAutoObservable } from 'mobx';
import type { ReactComponentDescriptor } from '/electron/main/code/components';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import type { ProjectsManager } from '@/lib/projects';

export const CREATE_NEW_COMPONENT = 'creare-new-component';
export class ProjectInfoManager {
    private projectComponents: ReactComponentDescriptor[];
    constructor(private projectsManager: ProjectsManager) {
        makeAutoObservable(this);
        this.scanComponents();
        this.projectComponents = [];
    }

    async scanComponents() {
        const projectRoot = this.projectsManager.project?.folderPath;

        if (!projectRoot) {
            console.warn('No project root found');
            this.projectComponents = [];
            return;
        }

        const components = (await invokeMainChannel(
            MainChannels.GET_COMPONENTS,
            projectRoot,
        )) as ReactComponentDescriptor[];
        this.projectComponents = components;
    }

    async duplicateComponent(filePath: string, componentName: string) {
        try {
            await invokeMainChannel(MainChannels.DUPLICATE_COMPONENT, {
                filePath,
                componentName,
            });
            this.scanComponents();
        } catch (error) {
            console.error('Failed to duplicate page:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    async renameComponent(newComponentName: string, filePath: string) {
        try {
            await invokeMainChannel(MainChannels.RENAME_COMPONENT, {
                newComponentName,
                filePath,
            });
            this.scanComponents();
        } catch (error) {
            console.error('Failed to duplicate page:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    async createUntitledComponent() {
        const newComponentObj: ReactComponentDescriptor = {
            name: '',
            sourceFilePath: this.projectsManager.project?.folderPath + '/app',
        };
        this.projectComponents = [...this.projectComponents, newComponentObj];
        window.dispatchEvent(new Event(CREATE_NEW_COMPONENT));
    }

    async createComponent(componentName: string, oid: string) {
        try {
            await invokeMainChannel(MainChannels.CREATE_COMPONENT, {
                componentName,
                oid,
            });
            this.scanComponents();
        } catch (error) {
            console.error('Failed to duplicate page:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    async deleteComponent(filePath: string) {
        try {
            await invokeMainChannel(MainChannels.DELETE_COMPONENT, {
                filePath,
            });
            this.scanComponents();
        } catch (error) {
            console.error('Failed to duplicate page:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(errorMessage);
        }
    }

    get components() {
        return this.projectComponents;
    }

    set components(newComponents: ReactComponentDescriptor[]) {
        this.projectComponents = newComponents;
    }
}
