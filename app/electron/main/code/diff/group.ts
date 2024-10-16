import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { CodeGroup } from '/common/models/actions/code';

export function groupElementsInNode(path: NodePath<t.JSXElement>, element: CodeGroup): void {
    console.log('groupElementsInNode', element);
    path.stop();
}
