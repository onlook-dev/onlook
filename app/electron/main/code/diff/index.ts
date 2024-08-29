import generate from '@babel/generator';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { parseJsx, removeSemiColonIfApplicable } from '../helpers';
import { getTemplateNode } from '../templateNode';
import { addClassToAst } from './class';
import { insertElementToAst } from './insert';
import { areTemplateNodesEqual } from '/common/helpers/template';
import { CodeDiff, CodeDiffRequest } from '/common/models/code';
import {
    DomActionElement,
    DomActionType,
    InsertedElement,
    MovedElementWithTemplate,
} from '/common/models/element/domAction';

export function getCodeDiffs(requests: CodeDiffRequest[]): CodeDiff[] {
    const diffs: CodeDiff[] = [];
    const generateOptions = { retainLines: true, compact: false };

    for (const request of requests) {
        const codeBlock = request.codeBlock;
        const ast = parseJsx(codeBlock);
        if (!ast) {
            continue;
        }
        const original = removeSemiColonIfApplicable(
            generate(ast, generateOptions, codeBlock).code,
            codeBlock,
        );

        if (request.attributes.className) {
            addClassToAst(ast, request.attributes.className);
        }

        const structureChangeElements: DomActionElement[] = [
            ...request.insertedElements,
            ...request.movedElements,
        ].sort((a, b) => a.timestamp - b.timestamp);

        for (const element of structureChangeElements) {
            if (element.type === DomActionType.MOVE) {
                // moveElementInAst(ast, element as MovedElementWithTemplate, request);
            } else if (element.type === DomActionType.INSERT) {
                insertElementToAst(ast, element as InsertedElement);
            }
        }

        const generated = removeSemiColonIfApplicable(
            generate(ast, generateOptions, codeBlock).code,
            codeBlock,
        );
        diffs.push({ original, generated, templateNode: request.templateNode });
    }

    return diffs;
}

function moveElementInAst(
    ast: any,
    element: MovedElementWithTemplate,
    request: CodeDiffRequest,
): void {
    let movedNode: t.JSXElement | null = null;

    traverse(ast, {
        JSXElement(path) {
            if (movedNode) {
                return;
            }

            const currentTemplate = getTemplateNode(
                path.node,
                request.templateNode.path,
                request.templateNode.startTag.start.line,
            );
            const childTemplateNode = element.templateNode;

            if (areTemplateNodesEqual(currentTemplate, childTemplateNode)) {
                movedNode = path.node;
                path.remove();
                path.stop();
            }
        },
    });

    if (!movedNode) {
        console.error('Element to be moved not found');
        return;
    }

    let processed = false;
    traverse(ast, {
        JSXElement(path) {
            if (processed || !movedNode) {
                return;
            }

            const index = element.location.index;

            // Insert moved node into children
            if (!path.node.children) {
                path.node.children = [];
            }

            if (index >= 0 && index <= path.node.children.length) {
                path.node.children.splice(index, 0, movedNode);
            } else {
                // If index is out of bounds, append to the end
                path.node.children.push(movedNode);
            }

            processed = true;
            path.stop();
        },
    });

    if (!processed) {
        console.error('Target location for moved element not found');
    }
}
