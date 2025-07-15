import { DefaultSettings } from '@onlook/constants';
import { removeFontFromTailwindTheme, addFontToTailwindTheme } from '@onlook/fonts';
import type { Font } from '@onlook/models';
import { normalizePath } from '../sandbox/helpers';
import type { EditorEngine } from '../engine';
import { makeAutoObservable } from 'mobx';

export class TailwindConfigManager {
    readonly tailwindConfigPath = normalizePath(DefaultSettings.TAILWIND_CONFIG);

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    /**
     * Removes a font from the Tailwind config
     */
    async removeFontFromTailwindConfig(font: Font): Promise<boolean> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            return false;
        }

        try {
            const file = await sandbox.readFile(this.tailwindConfigPath);
            if (!file || file.type === 'binary') {
                console.error("Tailwind config file is empty or doesn't exist");
                return false;
            }

            const content = file.content;
            const result = removeFontFromTailwindTheme(font.id, content);

            if (!result) {
                return false;
            }
            return await sandbox.writeFile(this.tailwindConfigPath, result);
        } catch (error) {
            console.error('Error removing font from Tailwind config:', error);
            return false;
        }
    }

    /**
     * Add a font to the Tailwind config
     */
    async addFontToTailwindConfig(font: Font): Promise<boolean> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            return false;
        }

        try {
            const file = await sandbox.readFile(this.tailwindConfigPath);
            if (!file || file.type === 'binary') {
                console.error("Tailwind config file is empty or doesn't exist");
                return false;
            }

            const content = file.content;
            const result = addFontToTailwindTheme(font, content);

            if (!result) {
                return false;
            }

            return await sandbox.writeFile(this.tailwindConfigPath, result);
        } catch (error) {
            console.error('Error updating Tailwind font config:', error);
            return false;
        }
    }

    /**
     * Ensures Tailwind config file exists
     */
    async ensureTailwindConfigExists(): Promise<void> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return;
        }

        const tailwindConfigExists = await sandbox.fileExists(this.tailwindConfigPath);
        if (!tailwindConfigExists) {
            await this.createNewTailwindConfigFile();
        }
    }

    /**
     * Creates a new Tailwind config file
     */
    private async createNewTailwindConfigFile(): Promise<void> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return;
        }

        const tailwindConfigContent = `import type { Config } from 'tailwindcss';
const config: Config = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './src/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        fontFamily: {},
    },
    plugins: [require('tailwindcss-animate')],
};

export default config;
`;

        try {
            await sandbox.writeFile(this.tailwindConfigPath, tailwindConfigContent);
            console.log(`Created new Tailwind config file at: ${this.tailwindConfigPath}`);
        } catch (error) {
            console.error('Error creating new Tailwind config file:', error);
        }
    }
}
