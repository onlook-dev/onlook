import { DefaultSettings } from '@onlook/constants';
import { removeFontFromTailwindTheme, addFontToTailwindTheme } from '@onlook/fonts';
import type { Font } from '@onlook/models';
import { normalizePath } from '../sandbox/helpers';
import type { SandboxManager } from '../sandbox';

const tailwindConfigPath = normalizePath(DefaultSettings.TAILWIND_CONFIG);

/**
 * Removes a font from the Tailwind config
 */
export const removeFontFromTailwindConfig = async (
    font: Font,
    sandbox: SandboxManager,
): Promise<boolean> => {
    try {
        const file = await sandbox.readFile(tailwindConfigPath);
        if (!file || file.type === 'binary') {
            console.error("Tailwind config file is empty or doesn't exist");
            return false;
        }

        const content = file.content;
        const result = removeFontFromTailwindTheme(font.id, content);

        if (!result) {
            return false;
        }
        return await sandbox.writeFile(tailwindConfigPath, result);
    } catch (error) {
        console.error('Error removing font from Tailwind config:', error);
        return false;
    }
};

/**
 * Add a font to the Tailwind config
 */
export const addFontToTailwindConfig = async (
    font: Font,
    sandbox: SandboxManager,
): Promise<boolean> => {
    try {
        const file = await sandbox.readFile(tailwindConfigPath);
        if (!file || file.type === 'binary') {
            console.error("Tailwind config file is empty or doesn't exist");
            return false;
        }

        const content = file.content;
        const result = addFontToTailwindTheme(font, content);

        if (!result) {
            return false;
        }

        return await sandbox.writeFile(tailwindConfigPath, result);
    } catch (error) {
        console.error('Error updating Tailwind font config:', error);
        return false;
    }
};

/**
 * Ensures Tailwind config file exists
 */
export const ensureTailwindConfigExists = async (sandbox: SandboxManager): Promise<void> => {
    const tailwindConfigExists = await sandbox.fileExists(tailwindConfigPath);
    if (!tailwindConfigExists) {
        await createNewTailwindConfigFile(sandbox);
    }
};

/**
 * Creates a new Tailwind config file
 */
export const createNewTailwindConfigFile = async (sandbox: SandboxManager): Promise<void> => {
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
        await sandbox.writeFile(tailwindConfigPath, tailwindConfigContent);
        console.log(`Created new Tailwind config file at: ${tailwindConfigPath}`);
    } catch (error) {
        console.error('Error creating new Tailwind config file:', error);
    }
};
