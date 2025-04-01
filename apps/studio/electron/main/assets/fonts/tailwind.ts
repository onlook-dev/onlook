import * as fs from 'fs';
import * as t from '@babel/types';
import { getConfigPath, modifyTailwindConfig } from '../helpers';
import type { Font } from '@onlook/models/assets';
import { camelCase } from 'lodash';
import { formatContent, writeFile } from '../../code/files';

/**
 * Updates the Tailwind configuration to include the new font family
 * Adds the font variable and fallback to the theme.fontFamily configuration
 */
export async function updateTailwindFontConfig(projectRoot: string, font: Font): Promise<void> {
    try {
        const { configPath } = getConfigPath(projectRoot);
        if (!configPath) {
            console.log('No Tailwind config file found');
            return;
        }

        const configContent = fs.readFileSync(configPath, 'utf-8');

        const { isUpdated, output } = modifyTailwindConfig(configContent, {
            visitor: (path) => {
                // Find the theme property
                if (
                    t.isIdentifier(path.node.key) &&
                    path.node.key.name === 'theme' &&
                    t.isObjectExpression(path.node.value)
                ) {
                    // Look for fontFamily inside theme
                    const themeProps = path.node.value.properties;

                    let fontFamilyProp = themeProps.find(
                        (prop: any) =>
                            t.isObjectProperty(prop) &&
                            t.isIdentifier(prop.key) &&
                            prop.key.name === 'fontFamily',
                    ) as t.ObjectProperty | undefined;

                    // If fontFamily doesn't exist, create it
                    if (!fontFamilyProp) {
                        fontFamilyProp = t.objectProperty(
                            t.identifier('fontFamily'),
                            t.objectExpression([]),
                        );
                        themeProps.push(fontFamilyProp);
                    }

                    if (t.isObjectExpression(fontFamilyProp.value)) {
                        const fontExists = fontFamilyProp.value.properties.some(
                            (prop) =>
                                t.isObjectProperty(prop) &&
                                t.isIdentifier(prop.key) &&
                                prop.key.name === font.id,
                        );
                        if (!fontExists) {
                            const fontVarName = `var(--font-${font.id})`;
                            const fallback = font.type === 'google' ? 'sans-serif' : 'monospace';

                            const fontArray = t.arrayExpression([
                                t.stringLiteral(fontVarName),
                                t.stringLiteral(fallback),
                            ]);

                            // Add the new font property to fontFamily
                            fontFamilyProp.value.properties.push(
                                t.objectProperty(t.identifier(camelCase(font.id)), fontArray),
                            );

                            return true;
                        }
                    }
                }
                return false;
            },
        });

        if (isUpdated) {
            const formattedOutput = await formatContent(configPath, output);
            await writeFile(configPath, formattedOutput);
        } else {
            console.log(
                `Font ${font.id} already exists in Tailwind config or couldn't update the config`,
            );
        }
    } catch (error) {
        console.error('Error updating Tailwind config with font:', error);
    }
}

/**
 * Removes a font configuration from the Tailwind config file
 * Cleans up the theme.fontFamily configuration by removing the specified font
 */
export async function removeFontFromTailwindConfig(projectRoot: string, font: Font): Promise<void> {
    try {
        const { configPath } = getConfigPath(projectRoot);
        if (!configPath) {
            console.log('No Tailwind config file found');
            return;
        }

        const configContent = fs.readFileSync(configPath, 'utf-8');

        // Use the new modifyTailwindConfig utility
        const { isUpdated, output } = modifyTailwindConfig(configContent, {
            visitor: (path) => {
                // Find the theme property
                if (
                    t.isIdentifier(path.node.key) &&
                    path.node.key.name === 'theme' &&
                    t.isObjectExpression(path.node.value)
                ) {
                    // Look for fontFamily inside theme
                    const themeProps = path.node.value.properties;

                    const fontFamilyProp = themeProps.find(
                        (prop: any) =>
                            t.isObjectProperty(prop) &&
                            t.isIdentifier(prop.key) &&
                            prop.key.name === 'fontFamily',
                    ) as t.ObjectProperty | undefined;

                    if (fontFamilyProp && t.isObjectExpression(fontFamilyProp.value)) {
                        // Find the font to remove
                        const properties = fontFamilyProp.value.properties;
                        const fontIndex = properties.findIndex(
                            (prop: any) =>
                                t.isObjectProperty(prop) &&
                                t.isIdentifier(prop.key) &&
                                prop.key.name === font.id,
                        );

                        // If the font is found, remove it
                        if (fontIndex !== -1) {
                            properties.splice(fontIndex, 1);
                            return true; // Signal that we updated the config
                        }
                    }
                }
                return false;
            },
        });

        if (isUpdated) {
            const formattedOutput = await formatContent(configPath, output);
            await writeFile(configPath, formattedOutput);
        } else {
            console.log(
                `Font ${font.id} not found in Tailwind config or couldn't update the config`,
            );
        }
    } catch (error) {
        console.error('Error removing font from Tailwind config:', error);
    }
}
