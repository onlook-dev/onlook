import { types as t, type t as T } from './packages';

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
