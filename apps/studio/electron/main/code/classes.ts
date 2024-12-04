import * as t from '@babel/types';
import { readCodeBlock } from '.';
import { parseJsxCodeBlock } from './helpers';
import type { TemplateNode } from '@onlook/models/element';

interface ParsedClasses {
    type: 'classes';
    value: string[];
}

interface ClassParsingError {
    type: 'error';
    reason: string;
}

export type ClassParsingResult = ParsedClasses | ClassParsingError;

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
            type: 'error',
            reason: 'No className attribute found.',
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

        // Checks if all classes in the expression are static
        const allStatic = templateLiteral.expressions.length === 0;

        // Returns the classes if all are static, otherwise returns a message
        if (allStatic) {
            const quasis = templateLiteral.quasis.map((quasi) => quasi.value.raw.split(/\s+/));
            return {
                type: 'classes',
                value: quasis.flat().filter(Boolean),
            };
        } else {
            return {
                type: 'error',
                reason: 'Dynamic classes detected. Dynamic variables in the className prevent extraction of Tailwind classes.',
            };
        }
    }

    return {
        type: 'error',
        reason: 'Unsupported className format.',
    };
}
