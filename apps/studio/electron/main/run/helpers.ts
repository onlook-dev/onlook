import * as t from '@babel/types';
import type { TemplateNode, TemplateTag } from '@onlook/models/element';
import * as fs from 'fs';
import * as nodePath from 'path';

const ALLOWED_EXTENSIONS = ['.jsx', '.tsx'];
const IGNORED_DIRECTORIES = ['node_modules', 'dist', 'build', '.next'];

export async function getValidFiles(dirPath: string): Promise<string[]> {
    const validFiles: string[] = [];

    function scanDirectory(currentPath: string) {
        const files = fs.readdirSync(currentPath);

        for (const file of files) {
            const filepath = nodePath.join(currentPath, file);
            const stat = fs.statSync(filepath);

            if (stat.isDirectory()) {
                if (!IGNORED_DIRECTORIES.includes(file)) {
                    scanDirectory(filepath);
                }
            } else {
                const fileExt = nodePath.extname(file);
                if (ALLOWED_EXTENSIONS.includes(fileExt)) {
                    validFiles.push(filepath);
                }
            }
        }
    }

    scanDirectory(dirPath);
    return validFiles;
}

export function isReactFragment(openingElement: any): boolean {
    const name = openingElement.name;

    if (t.isJSXIdentifier(name)) {
        return name.name === 'Fragment';
    }

    if (t.isJSXMemberExpression(name)) {
        return (
            t.isJSXIdentifier(name.object) &&
            name.object.name === 'React' &&
            t.isJSXIdentifier(name.property) &&
            name.property.name === 'Fragment'
        );
    }

    return false;
}

export function getTemplateNode(
    path: any,
    filename: string,
    componentStack: string[],
): TemplateNode {
    const startTag: TemplateTag = getTemplateTag(path.node.openingElement);
    const endTag: TemplateTag | undefined = path.node.closingElement
        ? getTemplateTag(path.node.closingElement)
        : undefined;
    const componentName =
        componentStack.length > 0 ? componentStack[componentStack.length - 1] : undefined;
    const domNode: TemplateNode = {
        path: filename,
        startTag,
        endTag,
        component: componentName,
    };
    return domNode;
}

function getTemplateTag(element: any): TemplateTag {
    return {
        start: {
            line: element.loc.start.line,
            column: element.loc.start.column + 1,
        },
        end: {
            line: element.loc.end.line,
            column: element.loc.end.column,
        },
    };
}
