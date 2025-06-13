import { type t as T, types as t } from '../packages';

export function updateNodeTextContent(node: T.JSXElement, textContent: string): void {
    // Split the text content by newlines
    const parts = textContent.split('\n');

    // If there's only one part (no newlines), handle as before
    if (parts.length === 1) {
        const textNode = node.children.find((child) => t.isJSXText(child)) as T.JSXText | undefined;
        if (textNode) {
            textNode.value = textContent;
        } else {
            node.children.unshift(t.jsxText(textContent));
        }
        return;
    }

    // Clear existing children
    node.children = [];

    // Add each part with a <br/> in between
    parts.forEach((part, index) => {
        if (part) {
            node.children.push(t.jsxText(part));
        }
        if (index < parts.length - 1) {
            node.children.push(
                t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier('br'), [], true), null, [], true),
            );
        }
    });
}
