import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { getTemplateNode } from '../templateNode';
import { createHashedTemplateToCodeDiff, hashTemplateNode } from './helpers';
import { insertElementToNode } from './insert';
import { moveElementInNode } from './move';
import { removeElementFromNode } from './remove';
import { addClassToNode, replaceNodeClasses } from './style';
import { updateNodeTextContent } from './text';
import { assertNever } from '/common/helpers';
import { CodeAction, CodeActionType } from '/common/models/actions/code';
import { CodeDiffRequest } from '/common/models/code';
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
                    if (codeDiffRequest.overrideClasses) {
                        replaceNodeClasses(path.node, codeDiffRequest.attributes.className);
                    } else {
                        addClassToNode(path.node, codeDiffRequest.attributes.className);
                    }
                }
                if (codeDiffRequest.textContent !== undefined) {
                    updateNodeTextContent(path.node, codeDiffRequest.textContent);
                }
                const structureChangeElements = [
                    ...codeDiffRequest.insertedElements,
                    ...codeDiffRequest.movedElements,
                    ...codeDiffRequest.removedElements,
                ];
                applyStructureChanges(path, filepath, structureChangeElements);
            }
        },
    });
}

function applyStructureChanges(
    path: NodePath<t.JSXElement>,
    filepath: string,
    elements: CodeAction[],
): void {
    for (const element of elements) {
        switch (element.type) {
            case CodeActionType.MOVE:
                moveElementInNode(path, filepath, element);
                break;
            case CodeActionType.INSERT:
                insertElementToNode(path, element);
                break;
            case CodeActionType.REMOVE:
                removeElementFromNode(path, element);
                break;
            default:
                assertNever(element);
        }
    }
}
