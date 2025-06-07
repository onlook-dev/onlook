import { types as t, type NodePath, type t as T } from './packages';

export function isReactFragment(openingElement: T.JSXOpeningElement): boolean {
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

export function isColorsObjectProperty(path: any): boolean {
    return (
        path.parent.type === 'ObjectExpression' &&
        path.node.key.type === 'Identifier' &&
        path.node.key.name === 'colors' &&
        path.node.value.type === 'ObjectExpression'
    );
}

export function isObjectExpression(node: any): node is T.ObjectExpression {
    return node.type === 'ObjectExpression';
}

export const genImportDeclaration = (
    fileExtension: string,
    dependency: string,
): T.VariableDeclaration | T.ImportDeclaration | null => {
    switch (fileExtension) {
        case '.js':
        case '.ts':
            return t.variableDeclaration('const', [
                t.variableDeclarator(
                    t.identifier(dependency),
                    t.callExpression(t.identifier('require'), [t.stringLiteral(dependency)]),
                ),
            ]);
        case '.mjs':
            return t.importDeclaration(
                [t.importDefaultSpecifier(t.identifier(dependency))],
                t.stringLiteral(dependency),
            );
        default:
            console.log('Skipping import declaration for file extension', fileExtension);
            return null;
    }
};

export const checkVariableDeclarationExist = (
    path: NodePath<T.VariableDeclarator>,
    dependency: string,
): boolean => {
    return (
        t.isIdentifier(path.node.id, { name: dependency }) &&
        t.isCallExpression(path.node.init) &&
        (path.node.init.callee as T.V8IntrinsicIdentifier).name === 'require' &&
        (path.node.init.arguments[0] as any).value === dependency
    );
};

export const genASTParserOptionsByFileExtension = (
    fileExtension: string,
    sourceType: string = 'module',
): object => {
    switch (fileExtension) {
        case '.ts':
            return {
                sourceType: sourceType,
                plugins: ['typescript'],
            };
        case '.js':
        case '.mjs':
        case '.cjs':
        default:
            return {
                sourceType: sourceType,
            };
    }
};
