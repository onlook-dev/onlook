import {
    Project,
    ts,
    Node,
    type FunctionDeclaration,
    type ClassDeclaration,
    type VariableStatement,
} from 'ts-morph';

import * as path from 'path';
import { promises as fs } from 'fs';

function isUppercase(s: string) {
    return s === s.toUpperCase();
}

export interface ReactComponentDescriptor {
    name: string;
    sourceFilePath: string;
    isDelete?: boolean;
}

function isExported(node: FunctionDeclaration | VariableStatement | ClassDeclaration) {
    return node.getModifiers().some((m) => m.getKind() === ts.SyntaxKind.ExportKeyword);
}

function getReactComponentDescriptor(
    node: Node,
): Omit<ReactComponentDescriptor, 'sourceFilePath'> | null {
    if (Node.isVariableStatement(node)) {
        if (!isExported(node)) {
            return null;
        }

        const declaration = node.getDeclarationList().getDeclarations().at(0);
        if (declaration == null) {
            return null;
        }

        const name = declaration.getName();
        if (name == null || !isUppercase(name[0])) {
            return null;
        }

        const initializer = declaration.getInitializer();
        if (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)) {
            return { name };
        }
    }

    if (Node.isFunctionDeclaration(node)) {
        if (!isExported(node)) {
            return null;
        }
        const name = node.getName();

        if (name != null && isUppercase(name[0])) {
            return { name };
        }
    }

    if (Node.isClassDeclaration(node)) {
        if (!isExported(node)) {
            return null;
        }
        const heritageClauses = node.getHeritageClauses();
        if (heritageClauses == null) {
            return null;
        }
        const isDerivedFromReactComponent = heritageClauses.some(
            (clause) =>
                clause.getText().includes('React.Component') ||
                clause.getText().includes('React.PureComponent'),
        );

        if (!isDerivedFromReactComponent) {
            return null;
        }

        const name = node.getName();
        if (name == null) {
            return null;
        }

        return { name };
    }

    return null;
}

function extractReactComponentsFromFile(filePath: string) {
    const project = new Project();
    const sourceFile = project.addSourceFileAtPath(filePath);

    const exportedComponents: ReactComponentDescriptor[] = [];

    sourceFile.forEachChild((node) => {
        const descriptor = getReactComponentDescriptor(node);
        if (descriptor != null) {
            exportedComponents.push({
                ...descriptor,
                sourceFilePath: sourceFile.getFilePath(),
                isDelete: false,
            });
        }
    });

    return exportedComponents;
}

async function scanDirectory(dir: string): Promise<string[]> {
    const filesInDirectory = await fs.readdir(dir);
    const validFiles = await Promise.all(
        filesInDirectory.flatMap(async (file) => {
            const fullPath = path.join(dir, file);
            if (fullPath.endsWith('node_modules')) {
                return [];
            }

            const isDirectory = (await fs.lstat(fullPath)).isDirectory();
            if (isDirectory) {
                return scanDirectory(fullPath);
            }

            if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
                return [fullPath];
            }
            return [];
        }),
    );

    return validFiles.flat();
}

export async function extractComponentsFromDirectory(dir: string) {
    const files = await scanDirectory(dir);
    const allExportedComponents: ReactComponentDescriptor[] = [];

    files.forEach((file) => {
        const components = extractReactComponentsFromFile(file);
        allExportedComponents.push(...components);
    });

    const updatedExportedComponent = checkIfComponentIsUsed(allExportedComponents, files);

    const filteredComponents = updatedExportedComponent.filter((component) => {
        const fileName = path.basename(component.sourceFilePath).toLowerCase();
        return !(fileName === 'page.tsx' || fileName === 'layout.tsx');
    });

    return filteredComponents;
}

export async function duplicateComponent(filePath: string, componentName: string) {
    try {
        const directory = path.dirname(filePath);

        const project = new Project();
        const sourceFile = project.addSourceFileAtPath(filePath);

        const baseName = componentName.replace(/\d+$/, '');
        const files = await fs.readdir(directory);

        const regex = new RegExp(`^${baseName}(\\d+)?.tsx$`);

        const existingNumbers = files
            .map((file) => {
                const match = file.match(regex);
                return match && match[1] ? parseInt(match[1], 10) : 0;
            })
            .filter((num) => num !== null)
            .sort((a, b) => a - b);

        const nextNumber = existingNumbers.length ? Math.max(...existingNumbers) + 1 : 1;
        const newComponentName = `${baseName}${nextNumber}`;

        const newFileName = `${newComponentName}.tsx`;
        const newFilePath = path.join(directory, newFileName);

        const clonedSourceFile = sourceFile.copy(newFilePath);

        const nodesToRename = [
            ...clonedSourceFile.getFunctions(),
            ...clonedSourceFile.getVariableDeclarations(),
            ...clonedSourceFile.getClasses(),
        ];

        nodesToRename.forEach((node) => {
            if (node.getName() === componentName) {
                node.rename(newComponentName);
            }
        });

        await clonedSourceFile.save();

        return newFilePath;
    } catch (error) {
        console.error('Error duplicating component:', error);
        throw error;
    }
}

export async function renameComponent(newName: string, filePath: string) {
    try {
        const directory = path.dirname(filePath);
        const oldFileName = path.basename(filePath, '.tsx');
        const newFilePath = path.join(directory, `${newName}.tsx`);

        const project = new Project();
        const sourceFile = project.addSourceFileAtPath(filePath);

        const nodesToRename = [
            ...sourceFile.getFunctions(),
            ...sourceFile.getVariableDeclarations(),
            ...sourceFile.getClasses(),
        ];

        let renamed = false;

        nodesToRename.forEach((node) => {
            if (node.getName() === oldFileName) {
                node.rename(newName);
                renamed = true;
            }
        });

        if (!renamed) {
            console.warn(`No matching component named '${oldFileName}' found for renaming.`);
        }

        await sourceFile.save();
        await fs.rename(filePath, newFilePath);

        return newFilePath;
    } catch (error) {
        console.error('Error renaming component:', error);
        throw error;
    }
}

export async function createNewComponent(componentName: string, filePath: string) {
    try {
        const dirPath = path.dirname(filePath);

        const newFilePath = path.join(dirPath, `${componentName}.tsx`);

        const componentTemplate = `export default function ${componentName}() {
    return (
        <div className="w-full min-h-screen flex items-center justify-center bg-white dark:bg-black transition-colors duration-200 flex-col p-4 gap-[32px]">
            <div className="text-center text-gray-900 dark:text-gray-100 p-4">
                <h1 className="text-4xl md:text-5xl font-semibold mb-4 tracking-tight">
                    This is a blank ${componentName}
                </h1>
            </div>
        </div>
    );
}`;

        await fs.writeFile(newFilePath, componentTemplate, 'utf-8');

        return newFilePath;
    } catch (error) {
        console.error('Error creating component:', error);
        throw error;
    }
}

function checkIfComponentIsUsed(
    allExportedComponents: ReactComponentDescriptor[],
    files: string[],
) {
    const project = new Project();

    files.forEach((filePath) => {
        project.addSourceFileAtPath(filePath);
    });

    const componentFiles = allExportedComponents.map((comp) => comp.sourceFilePath);

    const sourceFiles = project
        .getSourceFiles()
        .filter((file) => componentFiles.includes(file.getFilePath()));

    allExportedComponents.forEach((component) => {
        const componentName = component.name;

        const isUsed = sourceFiles.some((file) => {
            if (!file) {
                return false;
            }

            const isImported = file.getImportDeclarations().some((importDecl) => {
                const namedImports = importDecl
                    .getNamedImports()
                    .some((namedImport) => namedImport.getName() === componentName);
                const defaultImport = importDecl.getDefaultImport()?.getText() === componentName;
                return namedImports || defaultImport;
            });

            if (isImported) {
                return true;
            }

            const isJsxUsage = file
                .getDescendantsOfKind(ts.SyntaxKind.JsxOpeningElement)
                .some((jsxElement) => {
                    const tagName = jsxElement.getTagNameNode()?.getText();
                    return tagName === componentName;
                });

            return isJsxUsage;
        });

        component.isDelete = !isUsed;
    });

    return allExportedComponents;
}

export async function deleteComponent(filePath: string) {
    try {
        await fs.access(filePath);

        await fs.unlink(filePath);

        console.log(`Component deleted successfully: ${filePath}`);
    } catch (error) {
        console.error('Error deleting component:', error);
        throw error;
    }
}
