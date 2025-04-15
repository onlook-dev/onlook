import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { PageMetadata } from '@onlook/models';
import { promises as fs } from 'fs';
import * as path from 'path';
import { formatContent, writeFile } from '../code/files';
import { detectRouterType } from './helpers';

const DEFAULT_LAYOUT_CONTENT = `export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}`;

async function updateMetadataInFile(filePath: string, metadata: PageMetadata) {
    // Read the current file content
    const content = await fs.readFile(filePath, 'utf-8');

    // Parse the file content using Babel
    const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    let hasMetadataImport = false;
    let metadataNode: t.ExportNamedDeclaration | null = null;

    // Traverse the AST to find metadata import and export
    traverse(ast, {
        ImportDeclaration(path) {
            if (
                path.node.source.value === 'next' &&
                path.node.specifiers.some(
                    (spec) =>
                        t.isImportSpecifier(spec) &&
                        t.isIdentifier(spec.imported) &&
                        spec.imported.name === 'Metadata',
                )
            ) {
                hasMetadataImport = true;
            }
        },
        ExportNamedDeclaration(path) {
            const declaration = path.node.declaration;
            if (t.isVariableDeclaration(declaration)) {
                const declarator = declaration.declarations[0];
                if (t.isIdentifier(declarator.id) && declarator.id.name === 'metadata') {
                    metadataNode = path.node;
                }
            }
        },
    });

    // Add Metadata import if not present
    if (!hasMetadataImport) {
        const metadataImport = t.importDeclaration(
            [t.importSpecifier(t.identifier('Metadata'), t.identifier('Metadata'))],
            t.stringLiteral('next'),
        );
        ast.program.body.unshift(metadataImport);
    }
    // Create metadata object expression
    const metadataObject = t.objectExpression(
        Object.entries(metadata).map(([key, value]) => {
            if (typeof value === 'string') {
                if (key === 'metadataBase') {
                    return t.objectProperty(
                        t.identifier(key),
                        t.newExpression(t.identifier('URL'), [t.stringLiteral(value)]),
                    );
                }
                return t.objectProperty(t.identifier(key), t.stringLiteral(value));
            } else if (value === null) {
                return t.objectProperty(t.identifier(key), t.nullLiteral());
            } else if (Array.isArray(value)) {
                return t.objectProperty(
                    t.identifier(key),
                    t.arrayExpression(
                        value.map((v) => {
                            if (typeof v === 'string') {
                                return t.stringLiteral(v);
                            } else if (typeof v === 'object' && v !== null) {
                                return t.objectExpression(
                                    Object.entries(v).map(([k, val]) => {
                                        if (typeof val === 'string') {
                                            return t.objectProperty(
                                                t.identifier(k),
                                                t.stringLiteral(val),
                                            );
                                        } else if (typeof val === 'number') {
                                            return t.objectProperty(
                                                t.identifier(k),
                                                t.numericLiteral(val),
                                            );
                                        }
                                        return t.objectProperty(
                                            t.identifier(k),
                                            t.stringLiteral(String(val)),
                                        );
                                    }),
                                );
                            }
                            return t.stringLiteral(String(v));
                        }),
                    ),
                );
            } else if (typeof value === 'object' && value !== null) {
                return t.objectProperty(
                    t.identifier(key),
                    t.objectExpression(
                        Object.entries(value).map(([k, v]) => {
                            if (typeof v === 'string') {
                                return t.objectProperty(t.identifier(k), t.stringLiteral(v));
                            } else if (typeof v === 'number') {
                                return t.objectProperty(t.identifier(k), t.numericLiteral(v));
                            } else if (Array.isArray(v)) {
                                return t.objectProperty(
                                    t.identifier(k),
                                    t.arrayExpression(
                                        v.map((item) => {
                                            if (typeof item === 'string') {
                                                return t.stringLiteral(item);
                                            } else if (typeof item === 'object' && item !== null) {
                                                return t.objectExpression(
                                                    Object.entries(item).map(([ik, iv]) => {
                                                        if (typeof iv === 'string') {
                                                            return t.objectProperty(
                                                                t.identifier(ik),
                                                                t.stringLiteral(iv),
                                                            );
                                                        } else if (typeof iv === 'number') {
                                                            return t.objectProperty(
                                                                t.identifier(ik),
                                                                t.numericLiteral(iv),
                                                            );
                                                        }
                                                        return t.objectProperty(
                                                            t.identifier(ik),
                                                            t.stringLiteral(String(iv)),
                                                        );
                                                    }),
                                                );
                                            }
                                            return t.stringLiteral(String(item));
                                        }),
                                    ),
                                );
                            }
                            return t.objectProperty(t.identifier(k), t.stringLiteral(String(v)));
                        }),
                    ),
                );
            }
            return t.objectProperty(t.identifier(key), t.stringLiteral(String(value)));
        }),
    );

    // Create metadata variable declaration
    const metadataVarDecl = t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier('metadata'), metadataObject),
    ]);

    // Add type annotation
    const metadataTypeAnnotation = t.tsTypeAnnotation(t.tsTypeReference(t.identifier('Metadata')));
    (metadataVarDecl.declarations[0].id as t.Identifier).typeAnnotation = metadataTypeAnnotation;

    // Create metadata export
    const metadataExport = t.exportNamedDeclaration(metadataVarDecl);

    if (metadataNode) {
        // Replace existing metadata export
        const metadataExportIndex = ast.program.body.findIndex((node) => {
            if (!t.isExportNamedDeclaration(node) || !t.isVariableDeclaration(node.declaration)) {
                return false;
            }
            const declarator = node.declaration.declarations[0];
            return t.isIdentifier(declarator.id) && declarator.id.name === 'metadata';
        });

        if (metadataExportIndex !== -1) {
            ast.program.body[metadataExportIndex] = metadataExport;
        }
    } else {
        // Find the default export and add metadata before it
        const defaultExportIndex = ast.program.body.findIndex((node) =>
            t.isExportDefaultDeclaration(node),
        );

        if (defaultExportIndex === -1) {
            throw new Error('Could not find default export in the file');
        }

        ast.program.body.splice(defaultExportIndex, 0, metadataExport);
    }

    // Generate the updated code
    const { code } = generate(ast);

    const formattedContent = await formatContent(filePath, code);

    // Write the updated content back to the file
    await writeFile(filePath, formattedContent);
}

export async function updateNextJsPage(
    projectRoot: string,
    pagePath: string,
    metadata: PageMetadata,
) {
    try {
        const routerConfig = await detectRouterType(projectRoot);

        if (!routerConfig) {
            throw new Error('Could not detect Next.js router type');
        }

        if (routerConfig.type !== 'app') {
            throw new Error(
                'Page metadata update is only supported for App Router projects for now.',
            );
        }

        const fullPath = path.join(routerConfig.basePath, pagePath);
        const pageFilePath = path.join(fullPath, 'page.tsx');

        // Check if file exists
        let stats;
        try {
            stats = await fs.stat(pageFilePath);
        } catch (err) {
            if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
                throw new Error('Selected page not found');
            }
            throw err;
        }

        // Read the page content to check for 'use client'
        const pageContent = await fs.readFile(pageFilePath, 'utf-8');
        const hasUseClient =
            pageContent.includes("'use client'") || pageContent.includes('"use client"');

        if (hasUseClient) {
            // Check for layout.tsx in the same directory
            const layoutFilePath = path.join(fullPath, 'layout.tsx');
            let layoutExists = false;

            try {
                await fs.stat(layoutFilePath);
                layoutExists = true;
            } catch (err) {
                if (!(err instanceof Error && 'code' in err && err.code === 'ENOENT')) {
                    throw err;
                }
            }

            if (layoutExists) {
                // Update metadata in existing layout file
                await updateMetadataInFile(layoutFilePath, metadata);
            } else {
                // Create new layout file with metadata
                const layoutContent = `import type { Metadata } from 'next';\n\nexport const metadata: Metadata = ${JSON.stringify(metadata, null, 2)};\n\n${DEFAULT_LAYOUT_CONTENT}`;
                await writeFile(layoutFilePath, layoutContent);
            }
        } else {
            // Update metadata in the page file
            await updateMetadataInFile(pageFilePath, metadata);
        }

        return true;
    } catch (error) {
        console.error('Error updating page:', error);
        throw error;
    }
}
