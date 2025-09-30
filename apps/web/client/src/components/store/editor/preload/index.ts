import { LOCAL_PRELOAD_SCRIPT_SRC, PRELOAD_SCRIPT_SRC } from '@onlook/constants';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { normalizePath } from '../sandbox/helpers';

// TODO: Should be a collection of helpers
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
            if (!this.editorEngine.activeSandbox.session.provider) {
                console.warn(
                    '[PreloadScriptManager] No sandbox provider available for preload script file check',
                );
                return false;
            }
            // check if the file exists in the public folder
            const publicScriptPath = normalizePath(`public${LOCAL_PRELOAD_SCRIPT_SRC}`);
            const fileContent = await this.editorEngine.activeSandbox.readFile(publicScriptPath);

            if (fileContent && typeof fileContent === 'string' && fileContent.length > 0) {
                return true;
            }

            const success = await this.copyPreloadScriptToPublic(fileContent);
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
    private async copyPreloadScriptToPublic(existingFile: string | Uint8Array | null): Promise<boolean> {
        try {
            if (!this.editorEngine.activeSandbox.session.provider) {
                console.error('[PreloadScriptManager] No sandbox provider available for preload script file check');
                return false;
            }

            let scriptContent: string;
            try {
                const response = await fetch(PRELOAD_SCRIPT_SRC);
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
            if (existingFile && typeof existingFile === 'string' && existingFile.length > 0) {
                if (existingFile === scriptContent) {
                    return true;
                }
            }

            // Write the script content to the CodeSandbox project 
            await this.editorEngine.activeSandbox.writeFile(
                `public${LOCAL_PRELOAD_SCRIPT_SRC}`,
                scriptContent,
            );

            return true;
        } catch (error) {
            console.error('[PreloadScriptManager] Error copying preload script to public:', error);
            return false;
        }
    }
}
