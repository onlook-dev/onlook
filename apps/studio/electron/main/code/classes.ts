import * as t from '@babel/types';
import { readCodeBlock } from '.';
import { parseJsxCodeBlock } from './helpers';
import { TemplateNode } from '/common/models/element/templateNode';

export async function getTemplateNodeClass(templateNode: TemplateNode): Promise<string[]> {
    const codeBlock = await readCodeBlock(templateNode);
    const ast = parseJsxCodeBlock(codeBlock);
    if (!ast) {
        return [];
    }

    const classes = getNodeClasses(ast);
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
