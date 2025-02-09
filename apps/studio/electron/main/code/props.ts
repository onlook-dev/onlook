import * as t from '@babel/types';
import type { PropsParsingResult, TemplateNode, NodeProps } from '@onlook/models/element';
import { readCodeBlock } from '.';
import { parseJsxCodeBlock } from './helpers';

export async function getTemplateNodeProps(
    templateNode: TemplateNode,
): Promise<PropsParsingResult> {
    const codeBlock = await readCodeBlock(templateNode);
    if (codeBlock == null) {
        console.error(`Failed to read code block: ${templateNode.path}`);
        return { type: 'error', reason: 'Code block could not be read.' };
    }
    const ast = parseJsxCodeBlock(codeBlock);

    if (!ast) {
        return { type: 'error', reason: 'AST could not be parsed.' };
    }

    return getNodeAttributes(ast);
}

function getNodeAttributes(node: t.JSXElement): PropsParsingResult {
    try {
        const openingElement = node.openingElement;
        const props: NodeProps[] = [];

        openingElement.attributes.forEach((attr) => {
            if (
                !t.isJSXAttribute(attr) ||
                attr.name.name === 'className' ||
                attr.name.name === 'data-oid'
            ) {
                return;
            }

            const attrName = attr.name.name;
            let attrValue: boolean | string | number = true;
            let attrType: 'boolean' | 'text' | 'code' | 'number' = 'code';

            if (attr.value) {
                if (t.isStringLiteral(attr.value)) {
                    attrValue = attr.value.value;
                    attrType = 'text';
                } else if (t.isJSXExpressionContainer(attr.value)) {
                    const expr = attr.value.expression;
                    if (t.isBooleanLiteral(expr)) {
                        attrValue = expr.value;
                        attrType = 'boolean';
                    } else if (t.isStringLiteral(expr)) {
                        attrValue = expr.value;
                        attrType = 'text';
                    } else if (t.isNumericLiteral(expr)) {
                        attrValue = expr.value;
                        attrType = 'number';
                    } else {
                        attrValue = `{${expr.type}}`;
                        attrType = 'code';
                    }
                } else {
                    attrValue = `Unsupported type: ${attr.value.type}`;
                    attrType = 'code';
                }
            } else {
                attrType = 'boolean';
            }

            props.push({ key: attrName, value: attrValue, type: attrType });
        });

        return {
            type: 'props',
            props,
        };
    } catch (error) {
        console.error('Failed to parse component props:', error);
        return {
            type: 'error',
            reason: 'Failed to parse component props.',
        };
    }
}
