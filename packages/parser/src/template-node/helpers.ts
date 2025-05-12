import {
    CoreElementType,
    DynamicType,
    type ClassParsingResult,
    type TemplateNode,
    type TemplateTag,
} from '@onlook/models';
import { types as t, type NodePath, type t as T } from '../packages';

export function createTemplateNode(
    path: NodePath<T.JSXElement>,
    filename: string,
    componentStack: string[],
    dynamicType: DynamicType | null,
    coreElementType: CoreElementType | null,
): TemplateNode {
    const startTag: TemplateTag = getTemplateTag(path.node.openingElement);
    const endTag: TemplateTag | null = path.node.closingElement
        ? getTemplateTag(path.node.closingElement)
        : null;
    const component = componentStack.length > 0 ? componentStack[componentStack.length - 1] : null;
    const domNode: TemplateNode = {
        path: filename,
        startTag,
        endTag,
        component: component ?? null,
        dynamicType,
        coreElementType,
    };
    return domNode;
}

function getTemplateTag(element: T.JSXOpeningElement | T.JSXClosingElement): TemplateTag {
    return {
        start: {
            line: element.loc?.start?.line ?? 0,
            column: element.loc?.start?.column ?? 0 + 1,
        },
        end: {
            line: element.loc?.end?.line ?? 0,
            column: element.loc?.end?.column ?? 0,
        },
    };
}

export function getNodeClasses(node: T.JSXElement): ClassParsingResult {
    const openingElement = node.openingElement;
    const classNameAttr = openingElement.attributes.find(
        (attr): attr is T.JSXAttribute => t.isJSXAttribute(attr) && attr.name.name === 'className',
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
        const quasis = templateLiteral.quasis.map((quasi: T.TemplateElement) =>
            quasi.value.raw.split(/\s+/),
        );
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
