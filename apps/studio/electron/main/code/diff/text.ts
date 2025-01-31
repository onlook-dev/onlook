import * as t from '@babel/types';
import { readCodeBlock } from '..';
import runManager from '../../run';
import { parseJsxCodeBlock } from '../helpers';

export function updateNodeTextContent(node: t.JSXElement, textContent: string): void {
    const textNode = node.children.find((child) => t.isJSXText(child)) as t.JSXText | undefined;
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
    const jsxElement = await parseJsxCodeBlock(code);
    if (!jsxElement) {
        console.error('Failed to parse code block. No AST found.');
        return null;
    }

    const children = jsxElement.children;

    // If no children, element is empty and can be edited
    if (children.length === 0) {
        return true;
    }

    // Check if ALL children are JSX text nodes
    return children.every((child) => t.isJSXText(child));
}
