import { type t as T, types as t } from '../packages';

export function updateNodeTextContent(node: T.JSXElement, textContent: string): void {
    const textNode = node.children.find((child) => t.isJSXText(child)) as T.JSXText | undefined;
    if (textNode) {
        textNode.value = textContent;
    } else {
        node.children.unshift(t.jsxText(textContent));
    }
}
