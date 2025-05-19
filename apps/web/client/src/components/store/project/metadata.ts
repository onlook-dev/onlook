import { parse, traverse } from '@onlook/parser';
import * as t from '@babel/types';
import type { PageMetadata } from '@onlook/models';
import { useEditorEngine } from '@/components/store/editor';

export function extractObjectValue(obj: t.ObjectExpression): Record<string, any> {
    const result: Record<string, any> = {};
    for (const prop of obj.properties) {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
            const key = prop.key.name;
            if (t.isStringLiteral(prop.value)) {
                result[key] = prop.value.value;
            } else if (t.isObjectExpression(prop.value)) {
                result[key] = extractObjectValue(prop.value);
            } else if (t.isArrayExpression(prop.value)) {
                result[key] = extractArrayValue(prop.value);
            }
        }
    }
    return result;
}

export function extractArrayValue(arr: t.ArrayExpression): any[] {
    return arr.elements
        .map((element) => {
            if (t.isStringLiteral(element)) {
                return element.value;
            } else if (t.isObjectExpression(element)) {
                return extractObjectValue(element);
            } else if (t.isArrayExpression(element)) {
                return extractArrayValue(element);
            }
            return null;
        })
        .filter(Boolean);
}

export async function extractMetadata(filePath: string): Promise<PageMetadata | undefined> {
    try {
        const editorEngine = useEditorEngine();
        const content = await editorEngine.sandbox.readFile(filePath);
        if (!content) {
            return undefined;
        }

        // Parse the file content using Babel
        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        let metadata: PageMetadata | undefined;

        // Traverse the AST to find metadata export
        traverse(ast, {
            ExportNamedDeclaration(path) {
                const declaration = path.node.declaration;
                if (t.isVariableDeclaration(declaration)) {
                    const declarator = declaration.declarations[0];
                    if (
                        t.isIdentifier(declarator?.id) &&
                        declarator?.id?.name === 'metadata' &&
                        t.isObjectExpression(declarator?.init)
                    ) {
                        metadata = {};
                        // Extract properties from the object expression
                        for (const prop of declarator?.init?.properties ?? []) {
                            if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                                const key = prop.key.name;
                                if (t.isStringLiteral(prop.value)) {
                                    (metadata as any)[key] = prop.value.value;
                                } else if (t.isObjectExpression(prop.value)) {
                                    (metadata as any)[key] = extractObjectValue(prop.value);
                                } else if (t.isArrayExpression(prop.value)) {
                                    (metadata as any)[key] = extractArrayValue(prop.value);
                                }
                            }
                        }
                    }
                }
            },
        });

        return metadata;
    } catch (error) {
        console.error(`Error reading metadata from ${filePath}:`, error);
        return undefined;
    }
} 