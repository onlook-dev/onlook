import { type t as T, types as t } from '../packages';
import { getAstFromCodeblock } from '../parse';

export function updateNodeTextContent(node: T.JSXElement, textContent: string): void {
    const textNode = node.children.find((child) => t.isJSXText(child)) as T.JSXText | undefined;
    if (textNode) {
        textNode.value = textContent;
    } else {
        node.children.unshift(t.jsxText(textContent));
    }
}

export async function isChildTextEditable(oid: string): Promise<boolean | null> {
    const templateNode = runManager.getTemplateNode(oid);
    if (!templateNode) {
        console.error('Failed to get code block. No template node found.');
        return null;
    }
    const code = await readCodeBlock(templateNode, false);
    if (!code) {
        console.error('Failed to get code block. No code found.');
        return null;
    }
    const jsxElement = await getAstFromCodeblock(code);
    if (!jsxElement) {
        console.error('Failed to parse code block. No AST found.');
        return null;
    }

    // Check if element is an img tag
    if (
        jsxElement.openingElement.name.type === 'JSXIdentifier' &&
        jsxElement.openingElement.name?.name?.toLowerCase() === 'img'
    ) {
        return false;
    }

    const children = jsxElement.children;

    // If no children, element is empty and can be edited
    if (children.length === 0) {
        return true;
    }

    // Check if ALL children are JSX text nodes
    return children.every((child) => t.isJSXText(child));
}
