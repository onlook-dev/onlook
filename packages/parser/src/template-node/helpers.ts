import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import {
    CoreElementType,
    DynamicType,
    type TemplateNode,
    type TemplateTag
} from '@onlook/models';

export function createTemplateNode(
    path: NodePath<t.JSXElement>,
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
        component,
        dynamicType,
        coreElementType,
    };
    return domNode;
}

function getTemplateTag(element: t.JSXOpeningElement | t.JSXClosingElement): TemplateTag {
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
