import * as t from '@babel/types';
import {
    type NodeProps,
    type PropsParsingResult,
    PropsType,
    type TemplateNode,
} from '@onlook/models/element';
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
            let attrType: PropsType = PropsType.Code;

            if (attr.value) {
                if (t.isStringLiteral(attr.value)) {
                    attrValue = attr.value.value;
                    attrType = PropsType.String;
                } else if (t.isJSXExpressionContainer(attr.value)) {
                    const expr = attr.value.expression;
                    if (t.isBooleanLiteral(expr)) {
                        attrValue = expr.value;
                        attrType = PropsType.Boolean;
                    } else if (t.isStringLiteral(expr)) {
                        attrValue = expr.value;
                        attrType = PropsType.String;
                    } else if (t.isNumericLiteral(expr)) {
                        attrValue = expr.value;
                        attrType = PropsType.Number;
                    } else {
                        attrValue = `{${expr.type}}`;
                        attrType = PropsType.Code;
                    }
                } else {
                    attrValue = `Unsupported type: ${attr.value.type}`;
                    attrType = PropsType.Code;
                }
            } else {
                attrType = PropsType.Boolean;
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
