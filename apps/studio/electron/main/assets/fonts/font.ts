import * as pathModule from 'path';
import { DefaultSettings } from '@onlook/models/constants';
import type { Font } from '@onlook/models/assets';
import { camelCase } from 'lodash';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import generate from '@babel/generator';
import { readFile } from '../../code/files';
import fs from 'fs';
import { extractFontName, getFontFileName } from '@onlook/utility';

/**
 * Adds a new font to the project by:
 * 1. Adding the font import and configuration to fonts.ts
 * 2. Updating Tailwind config with the new font family
 * 3. Adding the font variable to the appropriate layout file
 */
export async function addFont(projectRoot: string, font: Font) {
    try {
        const fontPath = pathModule.join(projectRoot, DefaultSettings.FONT_CONFIG);
        const content = (await readFile(fontPath)) ?? '';

        // Convert the font family to the import name format (Pascal case, no spaces)
        const importName = font.family.replace(/\s+/g, '_');
        const fontName = camelCase(font.id);
        // Check if the import already exists
        const importRegex = new RegExp(
            `import\\s*{[^}]*${importName}[^}]*}\\s*from\\s*['"]next/font/google['"]`,
        );
        const importExists = importRegex.test(content);

        // Check if the font export already exists
        const exportRegex = new RegExp(`export\\s+const\\s+${fontName}\\s*=`);
        const exportExists = exportRegex.test(content);

        if (exportExists) {
            console.log(`Font ${fontName} already exists in font.ts`);
            return;
        }

        let newContent = content;

        if (!importExists) {
            // Check if there's already an import from next/font/google
            const googleImportRegex = /import\s*{([^}]*)}\s*from\s*['"]next\/font\/google['"]/;
            const googleImportMatch = content.match(googleImportRegex);

            if (googleImportMatch) {
                const currentImports = googleImportMatch[1];
                const newImport = currentImports.includes(importName)
                    ? currentImports
                    : `${currentImports}, ${importName}`;
                newContent = newContent.replace(
                    googleImportRegex,
                    `import {${newImport}} from 'next/font/google'`,
                );
            } else {
                newContent = `import { ${importName} } from 'next/font/google';\n${newContent}`;
            }
        }

        const fontConfig = `
export const ${fontName} = ${importName}({
    subsets: [${font.subsets.map((s) => `'${s}'`).join(', ')}],
    weight: [${font.weight?.map((w) => `'${w}'`).join(', ')}],
    style: [${font.styles?.map((s) => `'${s}'`).join(', ')}],
    variable: '${font.variable}',
    display: 'swap',
});
`;

        // Add a blank line before the new font if the file doesn't end with blank lines
        if (!newContent.endsWith('\n\n')) {
            if (newContent.endsWith('\n')) {
                newContent += '\n';
            } else {
                newContent += '\n\n';
            }
        }

        newContent += fontConfig;

        fs.writeFileSync(fontPath, newContent);
    } catch (error) {
        console.error('Error adding font:', error);
    }
}

/**
 * Removes a font from the project by:
 * 1. Removing the font from fonts.ts
 * 2. Removing the font from Tailwind config
 * 3. Removing the font variable from the layout file
 * 4. Updating default font if needed
 * 5. Deleting the font files from the fonts directory
 * 6. Removing localFont import if no longer used
 */
export async function removeFont(projectRoot: string, font: Font) {
    try {
        const fontPath = pathModule.join(projectRoot, DefaultSettings.FONT_CONFIG);
        const content = await readFile(fontPath);

        if (!content) {
            return;
        }

        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        const fontIdToRemove = font.id;
        const importToRemove = font.family.replace(/\s+/g, '_');
        let removedFont = false;
        const fontFilesToDelete: string[] = [];
        // Track if any localFont declarations remain after removal
        let hasRemainingLocalFonts = false;

        // Track all imports from next/font/google to know if we should remove the import
        traverse(ast, {
            ImportDeclaration(path) {
                if (path.node.source.value === 'next/font/google') {
                    const importSpecifiers = path.node.specifiers.filter((specifier) => {
                        if (t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported)) {
                            return specifier.imported.name !== importToRemove;
                        }
                        return true;
                    });

                    if (importSpecifiers.length === 0) {
                        path.remove();
                    } else if (importSpecifiers.length !== path.node.specifiers.length) {
                        path.node.specifiers = importSpecifiers;
                    }
                }
            },

            ExportNamedDeclaration(path) {
                if (t.isVariableDeclaration(path.node.declaration)) {
                    const declarations = path.node.declaration.declarations;

                    for (let i = 0; i < declarations.length; i++) {
                        const declaration = declarations[i];

                        // Check if this is a localFont declaration (not the one being removed)
                        if (
                            t.isIdentifier(declaration.id) &&
                            declaration.id.name !== fontIdToRemove &&
                            t.isCallExpression(declaration.init) &&
                            t.isIdentifier(declaration.init.callee) &&
                            declaration.init.callee.name === 'localFont'
                        ) {
                            hasRemainingLocalFonts = true;
                        }

                        if (
                            t.isIdentifier(declaration.id) &&
                            declaration.id.name === fontIdToRemove
                        ) {
                            // Extract font file paths from the local font configuration
                            if (
                                t.isCallExpression(declaration.init) &&
                                t.isIdentifier(declaration.init.callee) &&
                                declaration.init.callee.name === 'localFont' &&
                                declaration.init.arguments.length > 0 &&
                                t.isObjectExpression(declaration.init.arguments[0])
                            ) {
                                const fontConfig = declaration.init.arguments[0];
                                const srcProp = fontConfig.properties.find(
                                    (prop) =>
                                        t.isObjectProperty(prop) &&
                                        t.isIdentifier(prop.key) &&
                                        prop.key.name === 'src',
                                );

                                if (
                                    srcProp &&
                                    t.isObjectProperty(srcProp) &&
                                    t.isArrayExpression(srcProp.value)
                                ) {
                                    // Loop through the src array to find font file paths
                                    srcProp.value.elements.forEach((element) => {
                                        if (t.isObjectExpression(element)) {
                                            const pathProp = element.properties.find(
                                                (prop) =>
                                                    t.isObjectProperty(prop) &&
                                                    t.isIdentifier(prop.key) &&
                                                    prop.key.name === 'path',
                                            );

                                            if (
                                                pathProp &&
                                                t.isObjectProperty(pathProp) &&
                                                t.isStringLiteral(pathProp.value)
                                            ) {
                                                // Get the path value
                                                let fontFilePath = pathProp.value.value;
                                                if (fontFilePath.startsWith('../')) {
                                                    fontFilePath = fontFilePath.substring(3); // Remove '../' prefix
                                                }
                                                fontFilesToDelete.push(fontFilePath);
                                            }
                                        }
                                    });
                                }
                            }

                            if (declarations.length === 1) {
                                path.remove();
                            } else {
                                declarations.splice(i, 1);
                            }
                            removedFont = true;
                            break;
                        }
                    }
                }
            },
        });

        if (removedFont) {
            let { code } = generate(ast);

            // Remove localFont import if no localFont declarations remain
            if (!hasRemainingLocalFonts) {
                const localFontImportRegex =
                    /import\s+localFont\s+from\s+['"]next\/font\/local['"];\n?/g;
                code = code.replace(localFontImportRegex, '');
            }

            await fs.writeFileSync(fontPath, code);

            // Delete font files if found
            if (fontFilesToDelete.length > 0) {
                for (const fileRelativePath of fontFilesToDelete) {
                    const absoluteFilePath = pathModule.join(projectRoot, fileRelativePath);
                    if (fs.existsSync(absoluteFilePath)) {
                        try {
                            fs.unlinkSync(absoluteFilePath);
                            console.log(`Deleted font file: ${absoluteFilePath}`);
                        } catch (error) {
                            console.error(`Error deleting font file ${absoluteFilePath}:`, error);
                        }
                    } else {
                        console.log(`Font file not found: ${absoluteFilePath}`);
                    }
                }
            }
        } else {
            console.log(`Font ${fontIdToRemove} not found in font.ts`);
        }
    } catch (error) {
        console.error('Error removing font:', error);
    }
}

export async function addFonts(projectRoot: string, fonts: Font[]) {
    for (const font of fonts) {
        await addFont(projectRoot, font);
    }
}

/**
 * Adds a local font to the project by:
 * 1. Saving the font files to the fonts folder
 * 2. Adding the font configuration to fonts.ts using next/font/local
 */
export async function addLocalFont(
    projectRoot: string,
    fontFiles: {
        file: { name: string; buffer: number[] };
        name: string;
        weight: string;
        style: string;
    }[],
) {
    try {
        const fontPath = pathModule.join(projectRoot, DefaultSettings.FONT_CONFIG);
        const content = (await readFile(fontPath)) ?? '';

        // Check if the localFont import already exists
        const localFontImportRegex = /import\s+localFont\s+from\s+['"]next\/font\/local['"]/;
        const localFontImportExists = localFontImportRegex.test(content);

        // Create fonts directory if it doesn't exist
        const fontsDir = pathModule.join(projectRoot, DefaultSettings.FONT_FOLDER);
        if (!fs.existsSync(fontsDir)) {
            fs.mkdirSync(fontsDir, { recursive: true });
        }

        // Extract the base font name from the first file
        const baseFontName = extractFontName(fontFiles[0].file.name);
        const fontName = camelCase(`custom-${baseFontName}`);
        // check if the font name already exists
        const fontNameExists = content.includes(`export const ${fontName} = localFont({`);
        if (fontNameExists) {
            console.log(`Font ${fontName} already exists in font.ts`);
            return;
        }

        // Save font files and prepare font configuration
        const fontConfigs = await Promise.all(
            fontFiles.map(async (fontFile) => {
                const weight = fontFile.weight;
                const style = fontFile.style.toLowerCase();
                const fileName = getFontFileName(baseFontName, weight, style);
                const filePath = pathModule.join(
                    fontsDir,
                    `${fileName}.${fontFile.file.name.split('.').pop()}`,
                );

                // Save the file
                const buffer = Buffer.from(fontFile.file.buffer);
                fs.writeFileSync(filePath, buffer);

                return {
                    path: pathModule.join(
                        DefaultSettings.FONT_FOLDER,
                        `${fileName}.${fontFile.file.name.split('.').pop()}`,
                    ),
                    weight,
                    style,
                };
            }),
        );

        // Generate the font configuration
        const fontConfig = `
export const ${fontName} = localFont({
    src: [
        ${fontConfigs
            .map(
                (config) => `{
            path: '../${config.path}',
            weight: '${config.weight}',
            style: '${config.style}'
        }`,
            )
            .join(',\n        ')}
    ],
    variable: '--font-${fontName}',
    display: 'swap',
});
`;

        // Add a blank line before the new font if the file doesn't end with blank lines
        let newContent = content;
        if (!newContent.endsWith('\n\n')) {
            if (newContent.endsWith('\n')) {
                newContent += '\n';
            } else {
                newContent += '\n\n';
            }
        }

        // Add the localFont import if it doesn't exist
        if (!localFontImportExists) {
            newContent = `import localFont from 'next/font/local';\n${newContent}`;
        }

        newContent += fontConfig;

        fs.writeFileSync(fontPath, newContent);

        return fontName;
    } catch (error) {
        console.error('Error adding local font:', error);
        throw error;
    }
}
