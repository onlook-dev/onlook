import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { readCodeBlock } from '.';
import { parseJsx } from './helpers';
import { TemplateNode } from '/common/models/element/templateNode';

export async function getTemplateNodeClass(templateNode: TemplateNode): Promise<string[]> {
    const codeBlock = await readCodeBlock(templateNode);
    const ast = parseJsx(codeBlock);
    if (!ast) {
        return [];
    }

    let classes: string[] | null = null;
    traverse(ast, {
        JSXElement(path) {
            if (!path) {
                return;
            }
            if (classes) {
                return;
            }
            const node = path.node;
            classes = getNodeClasses(node);
            path.stop();
        },
    });

    return classes || [];
}

function getNodeClasses(node: t.JSXElement): string[] {
    const openingElement = node.openingElement;
    const classNameAttr = openingElement.attributes.find(
        (attr): attr is t.JSXAttribute => t.isJSXAttribute(attr) && attr.name.name === 'className',
    );

    if (!classNameAttr) {
        return [];
    }

    if (t.isStringLiteral(classNameAttr.value)) {
        return classNameAttr.value.value.split(/\s+/).filter(Boolean);
    }

    if (
        t.isJSXExpressionContainer(classNameAttr.value) &&
        t.isStringLiteral(classNameAttr.value.expression)
    ) {
        return classNameAttr.value.expression.value.split(/\s+/).filter(Boolean);
    }

    return [];
}
