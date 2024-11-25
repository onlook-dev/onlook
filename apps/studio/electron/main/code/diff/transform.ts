import traverse, { type NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import { type CodeAction, CodeActionType } from '@onlook/models/actions';
import type { CodeDiffRequest } from '@onlook/models/code';
import { groupElementsInNode, ungroupElementsInNode } from './group';
import { getOidFromJsxElement } from './helpers';
import { insertElementToNode } from './insert';
import { moveElementInNode } from './move';
import { removeElementFromNode } from './remove';
import { addClassToNode, replaceNodeClasses } from './style';
import { updateNodeTextContent } from './text';
import { assertNever } from '/common/helpers';

export function transformAst(ast: t.File, oidToCodeDiff: Map<string, CodeDiffRequest>): void {
    traverse(ast, {
        JSXElement(path) {
            const currentOid = getOidFromJsxElement(path.node.openingElement);
            if (!currentOid) {
                console.error('No oid found for jsx element');
                return;
            }
            const codeDiffRequest = oidToCodeDiff.get(currentOid);
            if (codeDiffRequest) {
                if (
                    codeDiffRequest.attributes &&
                    codeDiffRequest.attributes.className !== null &&
                    codeDiffRequest.attributes.className !== undefined
                ) {
                    if (codeDiffRequest.overrideClasses) {
                        replaceNodeClasses(path.node, codeDiffRequest.attributes.className);
                    } else {
                        addClassToNode(path.node, codeDiffRequest.attributes.className);
                    }
                }
                if (
                    codeDiffRequest.textContent !== undefined &&
                    codeDiffRequest.textContent !== null
                ) {
                    updateNodeTextContent(path.node, codeDiffRequest.textContent);
                }
                const structureChangeElements = [
                    ...codeDiffRequest.insertedElements,
                    ...codeDiffRequest.movedElements,
                    ...codeDiffRequest.removedElements,
                    ...codeDiffRequest.groupElements,
                    ...codeDiffRequest.ungroupElements,
                ];
                applyStructureChanges(path, structureChangeElements);
            }
        },
    });
}

function applyStructureChanges(path: NodePath<t.JSXElement>, elements: CodeAction[]): void {
    if (elements.length === 0) {
        return;
    }
    for (const element of elements) {
        switch (element.type) {
            case CodeActionType.MOVE:
                moveElementInNode(path, element);
                break;
            case CodeActionType.INSERT:
                insertElementToNode(path, element);
                break;
            case CodeActionType.REMOVE:
                removeElementFromNode(path, element);
                break;
            case CodeActionType.GROUP:
                groupElementsInNode(path, element);
                break;
            case CodeActionType.UNGROUP:
                ungroupElementsInNode(path, element);
                break;
            default:
                assertNever(element);
        }
    }
}
