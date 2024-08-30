import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { twMerge } from 'tailwind-merge';
import { getTemplateNode } from '../templateNode';
import { InsertPos } from '/common/models';
import { CodeDiffRequest } from '/common/models/code';
import { DomActionElement, DomActionType, InsertedElement } from '/common/models/element/domAction';
import { TemplateNode } from '/common/models/element/templateNode';

function hashTemplateNode(node: TemplateNode): string {
    return `${node.path}:${node.startTag.start.line}:${node.startTag.start.column}:${node.startTag.end.line}:${node.startTag.end.column}`;
}

function createHashedTemplateToCodeDiff(
    templateToCodeDiff: Map<TemplateNode, CodeDiffRequest>,
): Map<string, CodeDiffRequest> {
    const hashedTemplateToCodeDiff = new Map<string, CodeDiffRequest>();

    // Populate the new Map with hashed keys
    for (const [templateNode, codeDiffRequest] of templateToCodeDiff) {
        const hashedKey = hashTemplateNode(templateNode);
        hashedTemplateToCodeDiff.set(hashedKey, codeDiffRequest);
    }
    return hashedTemplateToCodeDiff;
}

export function applyModificationsToAst(
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
                // Apply class changes
                if (codeDiffRequest.attributes && codeDiffRequest.attributes.className) {
                    addClassToNode(path.node, codeDiffRequest.attributes.className);
                }

                // Apply structure changes
                const structureChangeElements = getStructureChangeElements(codeDiffRequest);
                applyStructureChanges(path, structureChangeElements);
            }
        },
    });
}

function getStructureChangeElements(request: CodeDiffRequest): DomActionElement[] {
    return [...request.insertedElements, ...request.movedElements].sort(
        (a, b) => a.timestamp - b.timestamp,
    );
}

function applyStructureChanges(path: NodePath<t.JSXElement>, elements: DomActionElement[]): void {
    for (const element of elements) {
        if (element.type === DomActionType.MOVE) {
            // moveElementInNode(path, element as MovedElementWithTemplate);
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
