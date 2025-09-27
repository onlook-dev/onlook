import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Font } from '@onlook/models';
import { CSSManager } from '../../src/components/store/editor/font/css-manager';
import type { EditorEngine } from '../../src/components/store/editor/engine';

describe('Font CSS Variable Integration', () => {
    let cssManager: CSSManager;
    let mockSandbox: any;
    let mockEditorEngine: EditorEngine;

    beforeEach(() => {
        mockSandbox = {
            readFile: vi.fn(),
            writeFile: vi.fn(),
            fileExists: vi.fn(),
        };

        mockEditorEngine = {
            activeSandbox: mockSandbox,
        } as unknown as EditorEngine;

        cssManager = new CSSManager(mockEditorEngine);
    });

    it('should handle complete font lifecycle: add -> add duplicate -> remove', async () => {
        const testFont: Font = {
            id: 'open-sans',
            family: 'Open Sans',
            variable: '--font-open-sans',
            subsets: ['latin'],
            weight: ['400', '600'],
            styles: ['normal'],
            type: 'google',
        };

        // Step 1: Initial file with no font variables
        mockSandbox.fileExists.mockResolvedValue(true);
        mockSandbox.readFile.mockResolvedValueOnce({
            type: 'text',
            content: `html, body { margin: 0; }`
        });
        mockSandbox.writeFile.mockResolvedValue(true);

        // Add font variable
        const addResult = await cssManager.addFontVariable(testFont);
        expect(addResult).toBe(true);
        expect(mockSandbox.writeFile).toHaveBeenCalledWith(
            'src/styles/globals.css',
            expect.stringContaining("--font-open-sans: 'Open Sans', sans-serif;")
        );

        // Step 2: Try to add the same font again (should skip)
        mockSandbox.readFile.mockResolvedValueOnce({
            type: 'text',
            content: `/* Onlook Font Variables */
:root {
  --font-open-sans: 'Open Sans', sans-serif;
}

html, body { margin: 0; }`
        });

        const addDuplicateResult = await cssManager.addFontVariable(testFont);
        expect(addDuplicateResult).toBe(true);
        // writeFile should not be called again since font already exists
        expect(mockSandbox.writeFile).toHaveBeenCalledTimes(1);

        // Step 3: Remove the font variable
        mockSandbox.readFile.mockResolvedValueOnce({
            type: 'text',
            content: `/* Onlook Font Variables */
:root {
  --font-open-sans: 'Open Sans', sans-serif;
}

html, body { margin: 0; }`
        });

        const removeResult = await cssManager.removeFontVariable(testFont);
        expect(removeResult).toBe(true);
        expect(mockSandbox.writeFile).toHaveBeenCalledWith(
            'src/styles/globals.css',
            expect.not.stringContaining("--font-open-sans: 'Open Sans', sans-serif;")
        );
        expect(mockSandbox.writeFile).toHaveBeenCalledWith(
            'src/styles/globals.css',
            expect.not.stringContaining('/* Onlook Font Variables */')
        );
    });

    it('should demonstrate the problem this fix solves', async () => {
        // Before the fix: Users select a font from font panel
        // Font gets added to Tailwind config and layout files
        // But CSS variables are NOT injected into globals.css
        // Result: font-{id} classes don't work because var(--font-{id}) is undefined

        const problematicFont: Font = {
            id: 'playfair-display',
            family: 'Playfair Display',
            variable: '--font-playfair-display',
            subsets: ['latin'],
            weight: ['400', '700'],
            styles: ['normal', 'italic'],
            type: 'google',
        };

        // After the fix: CSS variables are properly injected
        mockSandbox.fileExists.mockResolvedValue(true);
        mockSandbox.readFile.mockResolvedValue({
            type: 'text',
            content: `@tailwind base;
@tailwind components;
@tailwind utilities;`
        });
        mockSandbox.writeFile.mockResolvedValue(true);

        const result = await cssManager.addFontVariable(problematicFont);

        expect(result).toBe(true);
        expect(mockSandbox.writeFile).toHaveBeenCalledWith(
            'src/styles/globals.css',
            expect.stringContaining("--font-playfair-display: 'Playfair Display', sans-serif;")
        );

        // This ensures that when users use font-playfair-display in their Tailwind classes,
        // the CSS variable var(--font-playfair-display) is properly defined
    });
});