import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { twMerge } from 'tailwind-merge';
import { getTemplateNode } from '../templateNode';
import { InsertPos } from '/common/models';
import { CodeDiffRequest } from '/common/models/code';
import {
    DomActionElement,
    DomActionType,
    InsertedElement,
    MovedElementWithTemplate,
} from '/common/models/element/domAction';
import { TemplateNode } from '/common/models/element/templateNode';

export function transformAst(
    ast: t.File,
    filepath: string,
    templateToCodeDiff: Map<TemplateNode, CodeDiffRequest>,
): void {
    const hashedTemplateToCodeDiff = createHashedTemplateToCodeDiff(templateToCodeDiff);
    traverse(ast, {
        JSXElement(path) {
            const currentTemplate = getTemplateNode(path.node, filepath, 1);
            const hashedKey = hashTemplateNode(currentTemplate);
            const codeDiffRequest = hashedTemplateToCodeDiff.get(hashedKey);

            if (codeDiffRequest) {
                if (codeDiffRequest.attributes && codeDiffRequest.attributes.className) {
                    addClassToNode(path.node, codeDiffRequest.attributes.className);
                }
                const structureChangeElements = getStructureChangeElements(codeDiffRequest);
                applyStructureChanges(path, filepath, structureChangeElements);
            }
        },
    });
}

function createHashedTemplateToCodeDiff(
    templateToCodeDiff: Map<TemplateNode, CodeDiffRequest>,
): Map<string, CodeDiffRequest> {
    const hashedTemplateToCodeDiff = new Map<string, CodeDiffRequest>();
    for (const [templateNode, codeDiffRequest] of templateToCodeDiff) {
        const hashedKey = hashTemplateNode(templateNode);
        hashedTemplateToCodeDiff.set(hashedKey, codeDiffRequest);
    }
    return hashedTemplateToCodeDiff;
}

function hashTemplateNode(node: TemplateNode): string {
    return `${node.path}:${node.startTag.start.line}:${node.startTag.start.column}:${node.startTag.end.line}:${node.startTag.end.column}`;
}

function getStructureChangeElements(request: CodeDiffRequest): DomActionElement[] {
    return [...request.insertedElements, ...request.movedElements].sort(
        (a, b) => a.timestamp - b.timestamp,
    );
}

function applyStructureChanges(
    path: NodePath<t.JSXElement>,
    filepath: string,
    elements: DomActionElement[],
): void {
    for (const element of elements) {
        if (element.type === DomActionType.MOVE) {
            moveElementInNode(path, filepath, element as MovedElementWithTemplate);
        } else if (element.type === DomActionType.INSERT) {
            insertElementToNode(path, element as InsertedElement);
        }
    }
}

function insertElementToNode(path: NodePath<t.JSXElement>, element: InsertedElement): void {
    const newElement = createJSXElement(element);

    switch (element.location.position) {
        case InsertPos.APPEND:
            path.node.children.push(newElement);
            break;
        case InsertPos.PREPEND:
            path.node.children.unshift(newElement);
            break;
        case InsertPos.INDEX:
            if (
                element.location.index !== undefined &&
                element.location.index < path.node.children.length
            ) {
                path.node.children.splice(element.location.index + 1, 0, newElement);
            } else {
                console.error(`Invalid index: ${element.location.index}`);
                path.node.children.push(newElement);
            }
            break;
        default:
            console.error(`Unhandled position: ${element.location.position}`);
            path.node.children.push(newElement);
            break;
    }

    path.stop();
}

function createJSXElement(insertedChild: InsertedElement): t.JSXElement {
    const attributes = Object.entries(insertedChild.attributes || {}).map(([key, value]) =>
        t.jsxAttribute(
            t.jsxIdentifier(key),
            typeof value === 'string'
                ? t.stringLiteral(value)
                : t.jsxExpressionContainer(t.stringLiteral(JSON.stringify(value))),
        ),
    );

    const isSelfClosing = ['img', 'input', 'br', 'hr', 'meta', 'link'].includes(
        insertedChild.tagName.toLowerCase(),
    );

    const openingElement = t.jsxOpeningElement(
        t.jsxIdentifier(insertedChild.tagName),
        attributes,
        isSelfClosing,
    );

    let closingElement = null;
    if (!isSelfClosing) {
        closingElement = t.jsxClosingElement(t.jsxIdentifier(insertedChild.tagName));
    }

    const children = (insertedChild.children || []).map(createJSXElement);
    return t.jsxElement(openingElement, closingElement, children, isSelfClosing);
}

function addClassToNode(node: t.JSXElement, className: string): void {
    const openingElement = node.openingElement;
    const classNameAttr = openingElement.attributes.find(
        (attr) => t.isJSXAttribute(attr) && attr.name.name === 'className',
    ) as t.JSXAttribute | undefined;

    if (classNameAttr) {
        if (t.isStringLiteral(classNameAttr.value)) {
            classNameAttr.value.value = twMerge(classNameAttr.value.value, className);
        } else if (
            t.isJSXExpressionContainer(classNameAttr.value) &&
            t.isCallExpression(classNameAttr.value.expression)
        ) {
            classNameAttr.value.expression.arguments.push(t.stringLiteral(className));
        }
    } else {
        const newClassNameAttr = t.jsxAttribute(
            t.jsxIdentifier('className'),
            t.stringLiteral(className),
        );
        openingElement.attributes.push(newClassNameAttr);
    }
}

function moveElementInNode(
    path: NodePath<t.JSXElement>,
    filepath: string,
    element: MovedElementWithTemplate,
): void {
    // Note: children includes non-JSXElement which our index does not account for. We need to find the JSXElement-only index.

    const children = path.node.children;
    const elementToMoveIndex = children.findIndex((child) => {
        if (t.isJSXElement(child)) {
            const childTemplate = getTemplateNode(child, filepath, 1);
            const hashChild = hashTemplateNode(childTemplate);
            const hashElement = hashTemplateNode(element.templateNode);
            return hashChild === hashElement;
        }
        return false;
    });

    if (elementToMoveIndex !== -1) {
        const [elementToMove] = children.splice(elementToMoveIndex, 1);

        const jsxElements = children.filter(
            (child) => t.isJSXElement(child) || child === elementToMove,
        ) as t.JSXElement[];

        const targetIndex = Math.min(element.location.index, jsxElements.length);

        if (targetIndex === jsxElements.length) {
            children.push(elementToMove);
        } else {
            const targetChild = jsxElements[targetIndex];
            const targetChildIndex = children.indexOf(targetChild);
            children.splice(targetChildIndex, 0, elementToMove);
        }
    } else {
        console.error('Element to be moved not found');
    }
}
