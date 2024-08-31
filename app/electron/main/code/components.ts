import {
    Project,
    ts,
    Node,
    FunctionDeclaration,
    ClassDeclaration,
    VariableStatement,
} from 'ts-morph';

import * as path from 'path';
import * as fs from 'fs';

function isUppercase(s: string) {
    return s === s.toUpperCase();
}

interface ReactComponentDescriptor {
    name: string;
}

function isExported(node: FunctionDeclaration | VariableStatement | ClassDeclaration) {
    return node.getModifiers().some((m) => m.getKind() === ts.SyntaxKind.ExportKeyword);
}

function getReactComponentDescriptor(node: Node): ReactComponentDescriptor | null {
    if (Node.isVariableStatement(node)) {
        if (!isExported(node)) {
            return null;
        }

        const declaration = node.getDeclarationList().getDeclarations().at(0);
        if (declaration == null) {
            return null;
        }

        const name = declaration.getName();
        if (name == null) {
            return null;
        }

        const initializer = declaration.getInitializer();
        if (Node.isArrowFunction(initializer)) {
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
            exportedComponents.push(descriptor);
        }
    });

    return exportedComponents;
}

function scanDirectory(dir: string): string[] {
    let files: string[] = [];
    fs.readdirSync(dir).forEach((file) => {
        const fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            files = files.concat(scanDirectory(fullPath));
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            files.push(fullPath);
        }
    });
    return files;
}

export function extractComponentsFromDirectory(dir: string) {
    const files = scanDirectory(dir);
    const allExportedComponents: ReactComponentDescriptor[] = [];

    files.forEach((file) => {
        const components = extractReactComponentsFromFile(file);
        allExportedComponents.push(...components);
    });

    return allExportedComponents;
}
