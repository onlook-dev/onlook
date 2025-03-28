import * as pathModule from 'path';
import { DefaultSettings } from '@onlook/models/constants';
import type { Font } from '@onlook/models/assets';
import { camelCase } from 'lodash';
import {
    addFontVariableToAppLayout,
    addFontVariableToPageApp,
    removeFontVariableFromLayout,
} from './layout';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import generate from '@babel/generator';
import { removeFontFromTailwindConfig, updateTailwindFontConfig } from './tailwind';
import { detectRouterType } from '../../pages';
import { readFile } from '../../code/files';
import fs from 'fs';
/**
 * Adds a new font to the project by:
 * 1. Adding the font import and configuration to fonts.ts
 * 2. Updating Tailwind config with the new font family
 * 3. Adding the font variable to the appropriate layout file
 */
export async function addFont(projectRoot: string, font: Font) {
    try {
        const fontPath = pathModule.join(projectRoot, DefaultSettings.FONT_FOLDER);
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

        await fs.writeFileSync(fontPath, newContent);

        await updateTailwindFontConfig(projectRoot, font);

        const routerConfig = await detectRouterType(projectRoot);
        if (routerConfig) {
            if (routerConfig.type === 'app') {
                const layoutPath = pathModule.join(routerConfig.basePath, 'layout.tsx');
                await addFontVariableToAppLayout(layoutPath, fontName);
            } else {
                const appPath = pathModule.join(routerConfig.basePath, '_app.tsx');
                await addFontVariableToPageApp(appPath, fontName);
            }
        }
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
 */
export async function removeFont(projectRoot: string, font: Font) {
    try {
        const fontPath = pathModule.join(projectRoot, DefaultSettings.FONT_FOLDER);
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

                        if (
                            t.isIdentifier(declaration.id) &&
                            declaration.id.name === fontIdToRemove
                        ) {
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
            const { code } = generate(ast);
            await fs.writeFileSync(fontPath, code);

            await removeFontFromTailwindConfig(projectRoot, font);

            const routerConfig = await detectRouterType(projectRoot);
            if (routerConfig) {
                if (routerConfig.type === 'app') {
                    const layoutPath = pathModule.join(routerConfig.basePath, 'layout.tsx');
                    await removeFontVariableFromLayout(layoutPath, font.id, ['html']);
                } else {
                    const appPath = pathModule.join(routerConfig.basePath, '_app.tsx');
                    await removeFontVariableFromLayout(appPath, font.id, [
                        'div',
                        'main',
                        'section',
                        'body',
                    ]);
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
