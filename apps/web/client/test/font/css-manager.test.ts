import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Font } from '@onlook/models';
import { CSSManager } from '../../src/components/store/editor/font/css-manager';
import type { EditorEngine } from '../../src/components/store/editor/engine';

// Mock the editor engine
const mockSandbox = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    fileExists: vi.fn(),
};

const mockEditorEngine = {
    activeSandbox: mockSandbox,
} as unknown as EditorEngine;

describe('CSSManager', () => {
    let cssManager: CSSManager;
    let testFont: Font;

    beforeEach(() => {
        cssManager = new CSSManager(mockEditorEngine);
        testFont = {
            id: 'inter',
            family: 'Inter',
            variable: '--font-inter',
            subsets: ['latin'],
            weight: ['400', '700'],
            styles: ['normal'],
            type: 'google',
        };
        vi.clearAllMocks();
    });

    describe('addFontVariable', () => {
        it('should create new :root section when globals.css is empty', async () => {
            mockSandbox.fileExists.mockResolvedValue(true);
            mockSandbox.readFile.mockResolvedValue({
                type: 'text',
                content: ''
            });
            mockSandbox.writeFile.mockResolvedValue(true);

            const result = await cssManager.addFontVariable(testFont);

            expect(result).toBe(true);
            expect(mockSandbox.writeFile).toHaveBeenCalledWith(
                'src/styles/globals.css',
                expect.stringContaining('/* Onlook Font Variables */')
            );
            expect(mockSandbox.writeFile).toHaveBeenCalledWith(
                'src/styles/globals.css',
                expect.stringContaining(':root {')
            );
            expect(mockSandbox.writeFile).toHaveBeenCalledWith(
                'src/styles/globals.css',
                expect.stringContaining("--font-inter: 'Inter', sans-serif;")
            );
        });

        it('should add to existing :root section', async () => {
            const existingContent = `:root {
  --color-primary: blue;
}`;
            mockSandbox.fileExists.mockResolvedValue(true);
            mockSandbox.readFile.mockResolvedValue({
                type: 'text',
                content: existingContent
            });
            mockSandbox.writeFile.mockResolvedValue(true);

            const result = await cssManager.addFontVariable(testFont);

            expect(result).toBe(true);
            expect(mockSandbox.writeFile).toHaveBeenCalledWith(
                'src/styles/globals.css',
                expect.stringContaining('--color-primary: blue;')
            );
            expect(mockSandbox.writeFile).toHaveBeenCalledWith(
                'src/styles/globals.css',
                expect.stringContaining("--font-inter: 'Inter', sans-serif;")
            );
        });

        it('should not add duplicate font variables', async () => {
            const existingContent = `/* Onlook Font Variables */
:root {
  --font-inter: 'Inter', sans-serif;
}`;
            mockSandbox.fileExists.mockResolvedValue(true);
            mockSandbox.readFile.mockResolvedValue({
                type: 'text',
                content: existingContent
            });

            const result = await cssManager.addFontVariable(testFont);

            expect(result).toBe(true);
            expect(mockSandbox.writeFile).not.toHaveBeenCalled();
        });

        it('should handle missing globals.css gracefully', async () => {
            mockSandbox.fileExists.mockResolvedValue(false);

            const result = await cssManager.addFontVariable(testFont);

            expect(result).toBe(true); // Should still return true as it's not critical
            expect(mockSandbox.writeFile).not.toHaveBeenCalled();
        });
    });

    describe('removeFontVariable', () => {
        it('should remove font variable from :root section', async () => {
            const existingContent = `/* Onlook Font Variables */
:root {
  --font-inter: 'Inter', sans-serif;
  --font-roboto: 'Roboto', sans-serif;
}`;
            mockSandbox.fileExists.mockResolvedValue(true);
            mockSandbox.readFile.mockResolvedValue({
                type: 'text',
                content: existingContent
            });
            mockSandbox.writeFile.mockResolvedValue(true);

            const result = await cssManager.removeFontVariable(testFont);

            expect(result).toBe(true);
            expect(mockSandbox.writeFile).toHaveBeenCalledWith(
                'src/styles/globals.css',
                expect.not.stringContaining("--font-inter: 'Inter', sans-serif;")
            );
            expect(mockSandbox.writeFile).toHaveBeenCalledWith(
                'src/styles/globals.css',
                expect.stringContaining("--font-roboto: 'Roboto', sans-serif;")
            );
        });

        it('should clean up empty font section', async () => {
            const existingContent = `/* Onlook Font Variables */
:root {
  --font-inter: 'Inter', sans-serif;
}`;
            mockSandbox.fileExists.mockResolvedValue(true);
            mockSandbox.readFile.mockResolvedValue({
                type: 'text',
                content: existingContent
            });
            mockSandbox.writeFile.mockResolvedValue(true);

            const result = await cssManager.removeFontVariable(testFont);

            expect(result).toBe(true);
            expect(mockSandbox.writeFile).toHaveBeenCalledWith(
                'src/styles/globals.css',
                expect.not.stringContaining('/* Onlook Font Variables */')
            );
            expect(mockSandbox.writeFile).toHaveBeenCalledWith(
                'src/styles/globals.css',
                expect.not.stringContaining(':root {')
            );
        });

        it('should handle missing globals.css gracefully', async () => {
            mockSandbox.fileExists.mockResolvedValue(false);

            const result = await cssManager.removeFontVariable(testFont);

            expect(result).toBe(true);
            expect(mockSandbox.writeFile).not.toHaveBeenCalled();
        });
    });

    describe('findGlobalsPath', () => {
        it('should find globals.css in common locations', async () => {
            // Make fileExists return true for the first path it checks
            mockSandbox.fileExists
                .mockResolvedValueOnce(true) // src/styles/globals.css
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(false);

            mockSandbox.readFile.mockResolvedValue({
                type: 'text',
                content: ''
            });
            mockSandbox.writeFile.mockResolvedValue(true);

            const result = await cssManager.addFontVariable(testFont);

            expect(result).toBe(true);
            expect(mockSandbox.fileExists).toHaveBeenCalledWith('src/styles/globals.css');
        });
    });
});