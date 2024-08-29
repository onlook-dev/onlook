import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { getTemplateNode } from '../templateNode';
import { areTemplateNodesEqual } from '/common/helpers/template';
import { CodeDiffRequest } from '/common/models/code';
import { MovedElementWithTemplate } from '/common/models/element/domAction';

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
