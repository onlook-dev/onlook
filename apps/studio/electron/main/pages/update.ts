import { promises as fs } from 'fs';
import * as path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import generate from '@babel/generator';
import { detectRouterType } from './helpers';
import type { Metadata } from '@onlook/models';
import { formatContent, writeFile } from '../code/files';

export async function updateNextJsPage(projectRoot: string, pagePath: string, metadata: Metadata) {
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

        // Check if file exists
        let stats;
        try {
            stats = await fs.stat(fullPath);
        } catch (err) {
            if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
                throw new Error('Selected page not found');
            }
            throw err;
        }

        // Read the current file content
        const content = await fs.readFile(fullPath, 'utf-8');

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
                    return t.objectProperty(t.identifier(key), t.stringLiteral(value));
                } else if (Array.isArray(value)) {
                    return t.objectProperty(
                        t.identifier(key),
                        t.arrayExpression(value.map((v) => t.stringLiteral(v))),
                    );
                } else if (value === null) {
                    return t.objectProperty(t.identifier(key), t.nullLiteral());
                }
                return t.objectProperty(
                    t.identifier(key),
                    t.objectExpression(
                        Object.entries(value).map(([k, v]) =>
                            t.objectProperty(t.identifier(k), t.stringLiteral(v as string)),
                        ),
                    ),
                );
            }),
        );

        // Create metadata variable declaration
        const metadataVarDecl = t.variableDeclaration('const', [
            t.variableDeclarator(t.identifier('metadata'), metadataObject),
        ]);

        // Add type annotation
        const metadataTypeAnnotation = t.tsTypeAnnotation(
            t.tsTypeReference(t.identifier('Metadata')),
        );
        (metadataVarDecl.declarations[0].id as t.Identifier).typeAnnotation =
            metadataTypeAnnotation;

        // Create metadata export
        const metadataExport = t.exportNamedDeclaration(metadataVarDecl);

        if (metadataNode) {
            // Replace existing metadata export
            const metadataExportIndex = ast.program.body.findIndex((node) => {
                if (
                    !t.isExportNamedDeclaration(node) ||
                    !t.isVariableDeclaration(node.declaration)
                ) {
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

        const formattedContent = await formatContent(fullPath, code);

        // Write the updated content back to the file
        await writeFile(fullPath, formattedContent);
        return true;
    } catch (error) {
        console.error('Error updating page:', error);
        throw error;
    }
}
