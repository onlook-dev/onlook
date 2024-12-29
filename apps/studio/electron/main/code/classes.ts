import * as t from '@babel/types';
import type { ClassParsingResult, TemplateNode } from '@onlook/models/element';
import { readCodeBlock } from '.';
import { parseJsxCodeBlock } from './helpers';

export async function getTemplateNodeClass(
    templateNode: TemplateNode,
): Promise<ClassParsingResult> {
    const codeBlock = await readCodeBlock(templateNode);
    const ast = parseJsxCodeBlock(codeBlock);

    if (!ast) {
        return { type: 'error', reason: 'AST could not be parsed.' };
    }

    return getNodeClasses(ast);
}

function getNodeClasses(node: t.JSXElement): ClassParsingResult {
    const openingElement = node.openingElement;
    const classNameAttr = openingElement.attributes.find(
        (attr): attr is t.JSXAttribute => t.isJSXAttribute(attr) && attr.name.name === 'className',
    );

    if (!classNameAttr) {
        return {
            type: 'classes',
            value: [''],
        };
    }

    if (t.isStringLiteral(classNameAttr.value)) {
        return {
            type: 'classes',
            value: classNameAttr.value.value.split(/\s+/).filter(Boolean),
        };
    }

    if (
        t.isJSXExpressionContainer(classNameAttr.value) &&
        t.isStringLiteral(classNameAttr.value.expression)
    ) {
        return {
            type: 'classes',
            value: classNameAttr.value.expression.value.split(/\s+/).filter(Boolean),
        };
    }

    if (
        t.isJSXExpressionContainer(classNameAttr.value) &&
        t.isTemplateLiteral(classNameAttr.value.expression)
    ) {
        const templateLiteral = classNameAttr.value.expression;

        // Immediately return error if dynamic classes are detected within the template literal
        if (templateLiteral.expressions.length > 0) {
            return {
                type: 'error',
                reason: 'Dynamic classes detected.',
            };
        }

        // Extract and return static classes from the template literal if no dynamic classes are used
        const quasis = templateLiteral.quasis.map((quasi) => quasi.value.raw.split(/\s+/));
        return {
            type: 'classes',
            value: quasis.flat().filter(Boolean),
        };
    }

    return {
        type: 'error',
        reason: 'Unsupported className format.',
    };
}
