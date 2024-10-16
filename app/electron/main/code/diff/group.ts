import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { jsxFilter } from './helpers';
import { createInsertedElement, insertAtIndex } from './insert';
import { removeElementAtIndex } from './remove';
import { CodeGroup } from '/common/models/actions/code';

export function groupElementsInNode(path: NodePath<t.JSXElement>, element: CodeGroup): void {
    // Get target elements
    const children = path.node.children;
    const jsxElements = children.filter(jsxFilter);
    const targetIndices = element.targets.map((target) => target.index).sort();
    const targetElements = getElementsAtIndices(targetIndices, jsxElements);

    // Remove target elements from children
    targetElements.forEach((targetElement) => {
        removeElementAtIndex(jsxElements.indexOf(targetElement), jsxElements, children);
    });

    // Add target elements to container
    const container = createInsertedElement(element.container);
    container.children = targetElements;

    // Insert container at index
    insertAtIndex(path, container, element.location.index);

    path.stop();
}

function getElementsAtIndices(indices: number[], jsxElements: Array<t.JSXElement | t.JSXFragment>) {
    return indices.map((index) => jsxElements[index]);
}

/**
 * 
 * groupElementsInNode {
  type: 'group',
  location: {
    position: 'index',
    targetSelector: '[data-onlook-unique-id="3d5eaa83-7c7c-426d-99c6-7bc4de23cd69"]',
    index: 0
  },
  container: {
    type: 'insert',
    tagName: 'div',
    children: [],
    attributes: {
      className: 'flex static flex-row justify-center items-end gap-40 grid-cols-none grid-rows-none'
    },
    location: {
      position: 'index',
      targetSelector: '[data-onlook-unique-id="3d5eaa83-7c7c-426d-99c6-7bc4de23cd69"]',
      index: 0
    },
    uuid: 'a7q1LTcRt90ooEXuE22Jx'
  },
  targets: [
    {
      position: 'index',
      targetSelector: '[data-onlook-unique-id="3d5eaa83-7c7c-426d-99c6-7bc4de23cd69"]',
      index: 0
    },
    {
      position: 'index',
      targetSelector: '[data-onlook-unique-id="3d5eaa83-7c7c-426d-99c6-7bc4de23cd69"]',
      index: 1
    }
  ],
  uuid: 'a7q1LTcRt90ooEXuE22Jx'
}
 */
