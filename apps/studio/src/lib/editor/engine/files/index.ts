import type { ProjectsManager } from '@/lib/projects';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

export interface FileNode {
    id: string;
    name: string;
    path: string;
    isDirectory: boolean;
    children?: FileNode[];
    extension?: string;
}

export class FilesManager {
    private files: FileNode[] = [];
    private isLoading: boolean = false;

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this);
    }

    get tree() {
        return this.files;
    }

    get loading() {
        return this.isLoading;
    }

    /**
     * Scan all files in the project
     */
    async scanFiles() {
        try {
            const projectRoot = this.projectsManager.project?.folderPath;

            if (!projectRoot) {
                console.warn('No project root found');
                this.setFiles([]);
                return;
            }

            this.isLoading = true;
            const files = await invokeMainChannel<string, FileNode[]>(
                MainChannels.SCAN_FILES,
                projectRoot,
            );

            if (files?.length) {
                this.setFiles(files);
            } else {
                this.setFiles([]);
            }
        } catch (error) {
            console.error('Failed to scan files:', error);
            this.setFiles([]);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Get a flat list of files with specific extensions
     */
    async getProjectFiles(extensions?: string[]) {
        try {
            const projectRoot = this.projectsManager.project?.folderPath;

            if (!projectRoot) {
                throw new Error('No project root found');
            }

            this.isLoading = true;
            const files = await invokeMainChannel<
                { projectRoot: string; extensions?: string[] },
                FileNode[]
            >(MainChannels.GET_PROJECT_FILES, { projectRoot, extensions });

            return files || [];
        } catch (error) {
            console.error('Failed to get project files:', error);
            return [];
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Get file content by path
     */
    async getFileContent(filePath: string): Promise<string | null> {
        try {
            return await this.editorEngine.code.getFileContent(filePath, false);
        } catch (error) {
            console.error('Failed to get file content:', error);
            return null;
        }
    }

    /**
     * Update the files tree
     */
    private setFiles(files: FileNode[]) {
        this.files = files;
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.files = [];
        this.editorEngine = null as any;
    }
}
