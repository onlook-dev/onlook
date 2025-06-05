import { JS_FILE_EXTENSIONS } from '@onlook/constants';
import { type t as T, types as t, type NodePath } from './packages';

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
        case JS_FILE_EXTENSIONS[0]: // js
            return t.variableDeclaration('const', [
                t.variableDeclarator(
                    t.identifier(dependency),
                    t.callExpression(t.identifier('require'), [t.stringLiteral(dependency)]),
                ),
            ]);
        case JS_FILE_EXTENSIONS[2]: // mjs
            return t.importDeclaration(
                [t.importDefaultSpecifier(t.identifier(dependency))],
                t.stringLiteral(dependency),
            );
        default:
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

export const isSupportFileExtension = (fileExtension: string): boolean => {
    return JS_FILE_EXTENSIONS.indexOf(fileExtension as (typeof JS_FILE_EXTENSIONS)[number]) !== -1;
};

export const isViteProjectSupportFileExtension = (fileExtension: string): boolean => {
    return JS_FILE_EXTENSIONS.indexOf(fileExtension as (typeof JS_FILE_EXTENSIONS)[number]) !== -1;
};

export const genASTParserOptionsByFileExtension = (
    fileExtension: string,
    sourceType: string = 'module',
): object => {
    switch (fileExtension) {
        case JS_FILE_EXTENSIONS[0]: // js
            return {
                sourceType: sourceType,
            };
        case JS_FILE_EXTENSIONS[2]: // mjs
            return {
                sourceType: sourceType,
                plugins: ['jsx'],
            };
        case JS_FILE_EXTENSIONS[1]: // ts
            return {
                sourceType: sourceType,
                plugins: ['typescript'],
            };
        default:
            return {};
    }
};
