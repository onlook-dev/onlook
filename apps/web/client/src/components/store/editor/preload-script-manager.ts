import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from './engine';
import { parse, traverse, types as t, generate } from '@onlook/parser';
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
                console.warn(
                    '[PreloadScriptManager] No sandbox session available for preload script injection',
                );
                return false;
            }

            const preloadCopySuccess = await this.copyPreloadScriptToPublic();
            if (!preloadCopySuccess) {
                console.error(
                    '[PreloadScriptManager] Failed to copy preload script to public folder',
                );
                return false;
            }
            // TODO: Update after this PR is merged: https://github.com/onlook-dev/onlook/pull/2386
            const layoutPaths = [
                'app/layout.tsx',
                'src/app/layout.tsx',
                'pages/_app.tsx',
                'src/pages/_app.tsx',
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
                console.error(
                    '[PreloadScriptManager] Could not find layout file for preload script injection',
                );
                return false;
            }

            const layoutFile = await this.editorEngine.sandbox.readFile(layoutPath);
            if (!layoutFile || layoutFile.type !== 'text') {
                console.error(
                    '[PreloadScriptManager] Could not read layout file or file is not text',
                );
                return false;
            }

            const currentContent = layoutFile.content;

            // Remove old preload script from layout if it exists
            const cleanContent = this.removePreloadScriptFromLayout(currentContent);

            // Add preload script to layout
            const updatedContent = this.addPreloadScriptToLayout(cleanContent);

            if (updatedContent === currentContent) {
                console.warn(
                    '[PreloadScriptManager] Could not inject preload script - no suitable injection point found',
                );
                return false;
            }

            await this.editorEngine.sandbox.writeFile(layoutPath, updatedContent);

            this.state.isInjected = true;
            this.state.injectedAt = Date.now();

            return true;
        } catch (error) {
            console.error('[PreloadScriptManager] Failed to inject preload script:', error);
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
        const scriptSrc = '/onlook-preload-script.js';

        // Parse the layout file
        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript'],
        });

        let hasScriptImport = false;
        let scriptAdded = false;

        // Check if Script is already imported
        traverse(ast, {
            ImportDeclaration(path) {
                if (path.node.source.value === 'next/script') {
                    hasScriptImport = true;
                }
            },
        });

        // Add Script import if it doesn't exist
        if (!hasScriptImport) {
            const scriptImport = t.importDeclaration(
                [t.importDefaultSpecifier(t.identifier('Script'))],
                t.stringLiteral('next/script'),
            );

            // Find the position to insert the import
            let insertIndex = 0;
            for (let i = 0; i < ast.program.body.length; i++) {
                const node = ast.program.body[i];
                if (t.isImportDeclaration(node)) {
                    insertIndex = i + 1;
                } else {
                    break;
                }
            }

            ast.program.body.splice(insertIndex, 0, scriptImport);
        }

        // Add Script component to the body
        traverse(ast, {
            JSXElement(path) {
                // Check if this is the body element
                const openingElement = path.node.openingElement;
                if (
                    t.isJSXIdentifier(openingElement.name) &&
                    openingElement.name.name.toLowerCase() === 'body'
                ) {
                    // Check if Script is already added
                    const hasScript = path.node.children.some(
                        (child) =>
                            t.isJSXElement(child) &&
                            t.isJSXIdentifier(child.openingElement.name) &&
                            child.openingElement.name.name === 'Script' &&
                            child.openingElement.attributes.some(
                                (attr) =>
                                    t.isJSXAttribute(attr) &&
                                    t.isJSXIdentifier(attr.name) &&
                                    attr.name.name === 'src' &&
                                    t.isStringLiteral(attr.value) &&
                                    attr.value.value === scriptSrc,
                            ),
                    );

                    if (!hasScript) {
                        // Create Script element
                        const scriptElement = t.jsxElement(
                            t.jsxOpeningElement(
                                t.jsxIdentifier('Script'),
                                [
                                    t.jsxAttribute(
                                        t.jsxIdentifier('src'),
                                        t.stringLiteral(scriptSrc),
                                    ),
                                    t.jsxAttribute(
                                        t.jsxIdentifier('strategy'),
                                        t.stringLiteral('afterInteractive'),
                                    ),
                                    t.jsxAttribute(
                                        t.jsxIdentifier('type'),
                                        t.stringLiteral('module'),
                                    ),
                                    t.jsxAttribute(
                                        t.jsxIdentifier('id'),
                                        t.stringLiteral('onlook-preload-script'),
                                    ),
                                ],
                                true,
                            ),
                            null,
                            [],
                            true,
                        );

                        // Add Script element after children
                        path.node.children.push(t.jsxText('\n                '));
                        path.node.children.push(scriptElement);
                        path.node.children.push(t.jsxText('\n            '));
                        scriptAdded = true;
                    }
                }
            },
        });

        if (scriptAdded) {
            // Generate the modified code
            const output = generate(ast, {}, content);

            return output.code;
        } else {
            return content;
        }
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

        return updatedContent;
    }

    /**
     * Copy the preload script content to public/preload.js in the CodeSandbox project
     */
    private async copyPreloadScriptToPublic(): Promise<boolean> {
        try {
            let scriptContent: string;
            const isDev = process.env.NODE_ENV === 'development';
            const publicScriptPath = 'public/onlook-preload-script.js';

            if (isDev) {
                // Development: fetch from local server
                try {
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
`;
                }
            } else {
                // Production: read from public/onlook-preload-script.js
                try {
                    const response = await fetch('/onlook-preload-script.js');
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    scriptContent = await response.text();
                } catch (readError) {
                    console.error('[PreloadScriptManager] Error reading preload script from public directory:', readError);
                    return false;
                }
            }

            // Write the script content to public/onlook-preload-script.js (overwrite)
            const writeSuccess = await this.editorEngine.sandbox.writeFile(
                publicScriptPath,
                scriptContent,
                true,
            );

            return writeSuccess;
        } catch (error) {
            console.error('[PreloadScriptManager] Error copying preload script to public:', error);
            return false;
        }
    }

    /**
     * Clean up when manager is destroyed
     */
    async destroy(): Promise<void> {
        this.state = {
            isInjected: false,
            injectedAt: 0,
        };
    }
}
