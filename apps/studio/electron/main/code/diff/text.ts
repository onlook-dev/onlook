import * as t from '@babel/types';

export function updateNodeTextContent(node: t.JSXElement, textContent: string): void {
    const textNode = node.children.find((child) => t.isJSXText(child)) as t.JSXText | undefined;
    if (textNode) {
        textNode.value = textContent;
    } else {
        node.children.unshift(t.jsxText(textContent));
    }
}
