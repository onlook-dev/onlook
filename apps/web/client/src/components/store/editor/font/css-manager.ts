import type { Font } from '@onlook/models';
import type { EditorEngine } from '../engine';

export class CSSManager {
    private readonly cssFileName = 'globals.css';
    private readonly fontVariablesComment = '/* Onlook Font Variables */';

    constructor(private editorEngine: EditorEngine) {}

    /**
     * Injects a CSS variable for a font into the globals.css file
     */
    async addFontVariable(font: Font): Promise<boolean> {
        try {
            const globalsPath = await this.findGlobalsPath();
            if (!globalsPath) {
                console.warn('globals.css not found, skipping CSS variable injection');
                return true; // Not critical, fonts can still work via WebFont loading
            }

            const file = await this.editorEngine.activeSandbox.readFile(globalsPath);
            if (!file || file.type === 'binary') {
                console.error(`Failed to read globals.css at ${globalsPath}`);
                return false;
            }

            let content = file.content;
            const cssVariable = `  ${font.variable}: '${font.family}', sans-serif;`;
            
            // Check if font variable already exists
            if (content.includes(font.variable)) {
                return true; // Already exists
            }

            // Find or create the :root section for font variables
            content = this.injectFontVariableIntoRoot(content, cssVariable);
            
            return await this.editorEngine.activeSandbox.writeFile(globalsPath, content);
        } catch (error) {
            console.error('Error adding font CSS variable:', error);
            return false;
        }
    }

    /**
     * Removes a CSS variable for a font from the globals.css file
     */
    async removeFontVariable(font: Font): Promise<boolean> {
        try {
            const globalsPath = await this.findGlobalsPath();
            if (!globalsPath) {
                return true; // Nothing to remove
            }

            const file = await this.editorEngine.activeSandbox.readFile(globalsPath);
            if (!file || file.type === 'binary') {
                console.error(`Failed to read globals.css at ${globalsPath}`);
                return false;
            }

            let content = file.content;
            
            // Remove the font variable line
            const cssVariablePattern = new RegExp(`\\s*${this.escapeRegex(font.variable)}:\\s*[^;]+;\\s*\\n?`, 'g');
            content = content.replace(cssVariablePattern, '');
            
            // Clean up empty root section if no more font variables exist
            content = this.cleanupEmptyFontSection(content);
            
            return await this.editorEngine.activeSandbox.writeFile(globalsPath, content);
        } catch (error) {
            console.error('Error removing font CSS variable:', error);
            return false;
        }
    }

    /**
     * Finds the globals.css file path in common locations
     */
    private async findGlobalsPath(): Promise<string | null> {
        const commonPaths = [
            'src/styles/globals.css',
            'styles/globals.css',
            'src/app/globals.css',
            'app/globals.css',
            'src/globals.css',
            'globals.css'
        ];

        for (const path of commonPaths) {
            const exists = await this.editorEngine.activeSandbox.fileExists(path);
            if (exists) {
                return path;
            }
        }

        return null;
    }

    /**
     * Injects a font variable into the :root selector, creating one if it doesn't exist
     */
    private injectFontVariableIntoRoot(content: string, cssVariable: string): string {
        // Look for existing Onlook font variables section
        const fontSectionMatch = content.match(/(\/\* Onlook Font Variables \*\/\s*:root\s*\{[^}]*\})/s);
        
        if (fontSectionMatch) {
            // Add to existing font variables section
            const existingSection = fontSectionMatch[1];
            if (existingSection) {
                const newSection = existingSection.replace(/(\s*\})$/, `\n${cssVariable}\n$1`);
                return content.replace(existingSection, newSection);
            }
        }

        // Look for any existing :root selector
        const rootMatch = content.match(/(:root\s*\{[^}]*\})/s);
        
        if (rootMatch) {
            // Add to existing :root section with font variables comment
            const existingRoot = rootMatch[1];
            if (existingRoot) {
                const newRoot = existingRoot.replace(/(\s*\})$/, `\n\n  ${this.fontVariablesComment.slice(3, -3)}\n${cssVariable}\n$1`);
                return content.replace(existingRoot, newRoot);
            }
        }

        // Create new :root section at the top of the file
        const fontSection = `${this.fontVariablesComment}\n:root {\n${cssVariable}\n}\n\n`;
        return fontSection + content;
    }

    /**
     * Removes empty font variables sections after font removal
     */
    private cleanupEmptyFontSection(content: string): string {
        // Remove empty Onlook font variables sections
        const emptyFontSectionPattern = /\/\* Onlook Font Variables \*\/\s*:root\s*\{\s*\}\s*\n?/g;
        content = content.replace(emptyFontSectionPattern, '');
        
        // Remove orphaned comment if root section is empty
        const orphanedCommentPattern = /\/\* Onlook Font Variables \*\/\s*\n?/g;
        content = content.replace(orphanedCommentPattern, '');
        
        return content;
    }

    /**
     * Escapes special regex characters in font variable names
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}