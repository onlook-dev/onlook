import type { Node, ObjectExpression } from '@babel/types';
import type { ColorUpdate } from '@onlook/models/assets';
import fg from 'fast-glob';
import fs from 'fs';
import path from 'path';
import { readFile } from '../code/files';

export function getConfigPath(projectRoot: string): {
    configPath: string | null;
    cssPath: string | null;
} {
    const possiblePaths = [
        path.join(projectRoot, 'tailwind.config.js'),
        path.join(projectRoot, 'tailwind.config.ts'),
        path.join(projectRoot, 'tailwind.config.cjs'),
        path.join(projectRoot, 'tailwind.config.mjs'),
    ];

    let configPath = null;
    for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
            configPath = filePath;
            break;
        }
    }

    if (!configPath) {
        console.log('No Tailwind config file found');
        return { configPath: null, cssPath: null };
    }

    const possibleCssPaths = [
        path.join(projectRoot, 'app/globals.css'),
        path.join(projectRoot, 'src/app/globals.css'),
        path.join(projectRoot, 'styles/globals.css'),
        path.join(projectRoot, 'src/styles/globals.css'),
    ];

    let cssPath = null;
    for (const filePath of possibleCssPaths) {
        if (fs.existsSync(filePath)) {
            cssPath = filePath;
            break;
        }
    }

    if (!cssPath) {
        console.log('No globals.css file found');
        return { configPath, cssPath: null };
    }

    return { configPath, cssPath };
}

export function extractObject(node: Node): Record<string, any> {
    if (node.type !== 'ObjectExpression') {
        return {};
    }

    const result: Record<string, any> = {};
    node.properties.forEach((prop: any) => {
        if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
            if (prop.value.type === 'StringLiteral') {
                result[prop.key.name] = {
                    value: prop.value.value,
                    line: prop.loc.start.line,
                };
            } else if (prop.value.type === 'ObjectExpression') {
                result[prop.key.name] = extractObject(prop.value);
            }
        }
    });

    return result;
}

export function isColorsObjectProperty(path: any): boolean {
    return (
        path.parent.type === 'ObjectExpression' &&
        path.node.key.type === 'Identifier' &&
        path.node.key.name === 'colors' &&
        path.node.value.type === 'ObjectExpression'
    );
}

export function isObjectExpression(node: any): node is ObjectExpression {
    return node.type === 'ObjectExpression';
}

export async function initializeTailwindColorContent(
    projectRoot: string,
): Promise<ColorUpdate | null> {
    const { configPath, cssPath } = getConfigPath(projectRoot);
    if (!configPath || !cssPath) {
        return null;
    }

    const configContent = await readFile(configPath);
    const cssContent = await readFile(cssPath);
    if (!configContent || !cssContent) {
        return null;
    }

    return { configPath, cssPath, configContent, cssContent };
}

export function addTailwindRootColor(
    colorObj: ObjectExpression,
    newName: string,
    newCssVarName: string,
) {
    colorObj.properties.push({
        type: 'ObjectProperty',
        key: {
            type: 'Identifier',
            name: newName,
        },
        value: {
            type: 'ObjectExpression',
            properties: [
                {
                    type: 'ObjectProperty',
                    key: {
                        type: 'Identifier',
                        name: 'DEFAULT',
                    },
                    value: {
                        type: 'StringLiteral',
                        value: `var(--${newCssVarName})`,
                    },
                    computed: false,
                    shorthand: false,
                },
            ],
        },
        computed: false,
        shorthand: false,
    });
}

export async function findSourceFiles(projectRoot: string): Promise<string[]> {
    const pattern = path.join(projectRoot, '**/*.{ts,tsx,js,jsx}');
    return fg
        .sync(pattern)
        .filter(
            (file: string) =>
                !file.includes('node_modules') &&
                !file.includes('dist') &&
                !file.includes('.next') &&
                !file.includes('build'),
        );
}
