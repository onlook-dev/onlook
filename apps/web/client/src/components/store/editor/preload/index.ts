import { PRELOAD_SCRIPT_FILE_NAME } from '@onlook/constants';
import type { SandboxFile } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { normalizePath } from '../sandbox/helpers';

export class PreloadScriptManager {
    constructor(private readonly editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    /**
     * Ensure the preload script file exists in the public folder
     * This can be called independently to recover missing files
     */
    async ensurePreloadScriptFile(): Promise<boolean> {
        try {
            if (!this.editorEngine.sandbox.session.session) {
                console.warn(
                    '[PreloadScriptManager] No sandbox session available for preload script file check',
                );
                return false;
            }
            // check if the file exists in the public folder
            const publicScriptPath = normalizePath(`public/${PRELOAD_SCRIPT_FILE_NAME}`);
            const existingFile = await this.editorEngine.sandbox.readFile(publicScriptPath);

            if (existingFile && existingFile.type === 'text' && existingFile.content.length > 0) {
                return true;
            }

            const success = await this.copyPreloadScriptToPublic(existingFile);
            if (!success) {
                console.error('[PreloadScriptManager] Failed to copy preload script to public');
                return false;
            }

            return true;
        } catch (error) {
            console.error('[PreloadScriptManager] Error ensuring preload script file:', error);
            return false;
        }
    }

    /**
     * Copy the preload script content to the CodeSandbox project
     */
    private async copyPreloadScriptToPublic(existingFile: SandboxFile | null): Promise<boolean> {
        try {
            if (!this.editorEngine.sandbox.session.session) {
                console.error('[PreloadScriptManager] No sandbox session available for preload script file check');
                return false;
            }

            let scriptContent: string;
            try {
                const response = await fetch(`/${PRELOAD_SCRIPT_FILE_NAME}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                scriptContent = await response.text();
            } catch (readError) {
                console.error(
                    '[PreloadScriptManager] Error reading preload script from public directory:',
                    readError,
                );
                return false;
            }
            // if the file exists and has content, check if the content is the same
            if (existingFile && existingFile.type === 'text' && existingFile.content.length > 0) {
                if (existingFile.content === scriptContent) {
                    return true;
                }
            }

            // Write the script content to the CodeSandbox project 
            const writeSuccess = await this.editorEngine.sandbox.writeFile(
                `public/${PRELOAD_SCRIPT_FILE_NAME}`,
                scriptContent,
            );

            return writeSuccess;
        } catch (error) {
            console.error('[PreloadScriptManager] Error copying preload script to public:', error);
            return false;
        }
    }
}
