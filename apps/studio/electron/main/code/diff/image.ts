import { getCssClasses } from '@/lib/editor/engine/code/helpers';
import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { type CodeInsertImage, type CodeRemoveImage } from '@onlook/models/actions';

export function insertImageToNode(path: NodePath<t.JSXElement>, action: CodeInsertImage): void {
    // TODO: Implement this
    // Create and insert image into public folder
    console.log('insertImageToNode', action);
    const tailwindStyles = getCssClasses('insert', action.styles);
    console.log('tailwindStyles', tailwindStyles);
}

export function removeImageFromNode(path: NodePath<t.JSXElement>, action: CodeRemoveImage): void {
    // TODO: Implement this
    console.log('removeImageFromNode', action);
}
