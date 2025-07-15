import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from './engine';

interface PreloadScriptState {
    isInjected: boolean;
    injectedAt: number;
}

export class PreloadScriptManager {
    private state: PreloadScriptState = {
        isInjected: false,
        injectedAt: 0,
    };

    constructor(private readonly editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    async injectPreloadScript(): Promise<boolean> {        
        if (this.state.isInjected) {
            return false;
        }

        try {
            const session = this.editorEngine.sandbox.session.session;
            if (!session) {
                console.warn('[PreloadScriptManager] No sandbox session available for preload script injection');
                return false;
            }

            const preloadCopySuccess = await this.copyPreloadScriptToPublic();
            if (!preloadCopySuccess) {
                console.error('[PreloadScriptManager] Failed to copy preload script to public folder');
                return false;
            }

            const layoutPaths = [
                'app/layout.tsx',
                'src/app/layout.tsx',
                'pages/_app.tsx',
                'src/pages/_app.tsx'
            ];

            let layoutPath: string | null = null;
            for (const path of layoutPaths) {
                try {
                    const exists = await this.editorEngine.sandbox.fileExists(path);
                    if (exists) {
                        layoutPath = path;
                        break;
                    }
                } catch (error) {
                    console.warn(`[PreloadScriptManager] Error checking ${path}:`, error);
                    // Continue to next path
                }
            }

            if (!layoutPath) {
                console.error('[PreloadScriptManager] Could not find layout file for preload script injection');
                return false;
            }

            const layoutFile = await this.editorEngine.sandbox.readFile(layoutPath);
            if (!layoutFile || layoutFile.type !== 'text') {
                console.error('[PreloadScriptManager] Could not read layout file or file is not text');
                return false;
            }
            
            const currentContent = layoutFile.content;
            
            const hasOnlookScript = currentContent.includes('onlook-preload-script');
            const hasPreloadJs = currentContent.includes('preload.js');
            
            if (hasOnlookScript || hasPreloadJs) {
                this.state.isInjected = true;
                this.state.injectedAt = Date.now();
                return false; // Already injected
            }

            const updatedContent = this.addPreloadScriptToLayout(currentContent);
            
            if (updatedContent === currentContent) {
                console.warn('[PreloadScriptManager] Could not inject preload script - no suitable injection point found');
                return false;
            }

            await this.editorEngine.sandbox.writeFile(layoutPath, updatedContent);

            this.state.isInjected = true;
            this.state.injectedAt = Date.now();
            
            return true;
        } catch (error) {
            console.error('[PreloadScriptManager] Failed to inject preload script:', error);
            console.error('[PreloadScriptManager] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            return false;
        }
    }

    /**
     * Remove the preload script by updating the layout.tsx file and deleting public/preload.js when editing stops
     */
    async removePreloadScript(): Promise<boolean> {
        if (!this.state.isInjected) {
            return false;
        }

        try {
            const session = this.editorEngine.sandbox.session.session;
            if (!session) {
                console.warn('[PreloadScriptManager] No sandbox session available for preload script removal');
                return false;
            }

            const layoutRemovalSuccess = await this.removeScriptFromLayout();
            await this.removePreloadScriptFile();

            const success = layoutRemovalSuccess;
            if (success) {
                this.state.isInjected = false;
            }

            return success;
        } catch (error) {
            console.error('[PreloadScriptManager] Failed to remove preload script:', error);
            return false;
        }
    }

    /**
     * Check if preload script is currently injected
     */
    get isInjected(): boolean {
        const injected = this.state.isInjected;
        return injected;
    }

    /**
     * Get injection timestamp for debugging
     */
    get injectedAt(): number {
        const timestamp = this.state.injectedAt;
        return timestamp;
    }

    /**
     * Add preload script to layout content
     */
    private addPreloadScriptToLayout(content: string): string {
        const scriptSrc = '/preload.js';

        const scriptTag = `
                <Script
                    id="onlook-preload-script"
                    type="module"
                    src="${scriptSrc}"
                    strategy="beforeInteractive"
                />`;

        // Try to inject into existing head tag
        const headRegex = /(<head[^>]*>)([\s\S]*?)(<\/head>)/i;
        const headMatch = headRegex.exec(content);
        
        if (headMatch) {
            const [, openTag, headContent, closeTag] = headMatch;
            const updatedHead = `${openTag}${headContent}${scriptTag}
            ${closeTag}`;
            const result = content.replace(headRegex, updatedHead);
            return result;
        }

        // Try to inject after opening html tag
        const htmlRegex = /(<html[^>]*>)/i;
        
        if (htmlRegex.test(content)) {
            const result = content.replace(htmlRegex, `$1
            <head>${scriptTag}
            </head>`);
            return result;
        }

        // Last resort: inject at the beginning of the file if it contains JSX
        const hasExportDefault = content.includes('export default function');
        const hasReturn = content.includes('return');
        
        if (hasExportDefault && hasReturn) {
            // Make sure Script is imported
            let updatedContent = content;
            const hasScriptImport = content.includes('import Script from \'next/script\'') || content.includes('import { Script }');
            
            if (!hasScriptImport) {
                const importRegex = /(import.*from.*['"];?\s*)/;
                const lastImportMatch = [...content.matchAll(new RegExp(importRegex.source, 'g'))].pop();
                if (lastImportMatch) {
                    const insertPoint = lastImportMatch.index + lastImportMatch[0].length;
                    updatedContent = content.slice(0, insertPoint) + 
                        `import Script from 'next/script';\n` + 
                        content.slice(insertPoint);
                } else {
                    updatedContent = `import Script from 'next/script';\n` + content;
                }
            }
            return updatedContent;
        }

        return content;
    }

    /**
     * Remove preload script from layout content
     */
    private removePreloadScriptFromLayout(content: string): string {
        // Remove the script tag - handle both self-closing and regular script tags
        const scriptRegex = /<Script[^>]*id="onlook-preload-script"[^>]*\/?>(?:\s*<\/Script>)?/gi;
        let updatedContent = content.replace(scriptRegex, '');
        
        // Also remove any script tags that reference preload.js
        const preloadJsRegex = /<Script[^>]*src="[^"]*preload\.js"[^>]*\/?>(?:\s*<\/Script>)?/gi;
        updatedContent = updatedContent.replace(preloadJsRegex, '');

        // Remove the import if it's not used elsewhere
        if (!updatedContent.includes('<Script') && !updatedContent.includes('Script ')) {
            const importRegex = /import\s+Script\s+from\s+['"]next\/script['"];\s*\n?/gi;
            updatedContent = updatedContent.replace(importRegex, '');
        }

        return updatedContent;
    }

    /**
     * Copy the preload script content to public/preload.js in the CodeSandbox project
     */
    private async copyPreloadScriptToPublic(): Promise<boolean> {
        try {
            // Fetch the preload script content from the local server or built file
            let scriptContent: string;
            try {
                // We need to fetch this from the actual file system, not CodeSandbox
                const response = await fetch('http://localhost:8083/');
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                scriptContent = await response.text();
            } catch (fetchError) {
                // Fallback: create a minimal preload script
                scriptContent = `
// Onlook Preload Script (Fallback)
console.log('Onlook preload script loaded');

// This is a fallback version - the full script should be served from localhost:8083
if (typeof window !== 'undefined') {
    window.onlookPreloadLoaded = true;
}
`;
            }

            // Ensure public directory exists
            const publicDirExists = await this.editorEngine.sandbox.fileExists('public');
            if (!publicDirExists) {
                // CodeSandbox will create the directory when we write a file to it
            }

            // Write the script content to public/preload.js
            const publicScriptPath = 'public/preload.js';
            const writeSuccess = await this.editorEngine.sandbox.writeFile(publicScriptPath, scriptContent);
            
            return writeSuccess;
        } catch (error) {
            console.error('[PreloadScriptManager] Error copying preload script to public:', error);
            return false;
        }
    }

    /**
     * Remove script tag from layout file
     */
    private async removeScriptFromLayout(): Promise<boolean> {
        try {
            // Find the layout file
            const layoutPaths = [
                'app/layout.tsx',
                'src/app/layout.tsx', 
                'pages/_app.tsx',
                'src/pages/_app.tsx'
            ];

            let layoutPath: string | null = null;
            for (const path of layoutPaths) {
                try {
                    const exists = await this.editorEngine.sandbox.fileExists(path);
                    if (exists) {
                        layoutPath = path;
                        break;
                    }
                } catch (error) {
                    // Continue to next path
                }
            }

            if (!layoutPath) {
                console.error('[PreloadScriptManager] Could not find layout file for preload script removal');
                return false;
            }

            // Read the current layout file
            const layoutFile = await this.editorEngine.sandbox.readFile(layoutPath);
            if (!layoutFile || layoutFile.type !== 'text') {
                console.error('[PreloadScriptManager] Could not read layout file or file is not text');
                return false;
            }
            
            const currentContent = layoutFile.content;
            
            // Remove the preload script
            const updatedContent = this.removePreloadScriptFromLayout(currentContent);
            
            if (updatedContent === currentContent) {
                // No changes needed
                return true;
            }

            // Write the updated content back
            await this.editorEngine.sandbox.writeFile(layoutPath, updatedContent);
            return true;
        } catch (error) {
            console.error('[PreloadScriptManager] Error removing script from layout:', error);
            return false;
        }
    }

    /**
     * Remove the public/preload.js file
     */
    private async removePreloadScriptFile(): Promise<boolean> {
        try {
            const publicScriptPath = 'public/preload.js';
            const exists = await this.editorEngine.sandbox.fileExists(publicScriptPath);
            if (!exists) {
                return true;
            }

            const deleteSuccess = await this.editorEngine.sandbox.delete(publicScriptPath);
            return deleteSuccess;
        } catch (error) {
            console.error('[PreloadScriptManager] Error removing preload script file:', error);
            return false;
        }
    }

    /**
     * Clean up when manager is destroyed
     */
    async destroy(): Promise<void> {
        await this.removePreloadScript();
        this.state = {
            isInjected: false,
            injectedAt: 0,
        };
    }
} 