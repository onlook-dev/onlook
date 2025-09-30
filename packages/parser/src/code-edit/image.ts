import type { CodeInsertImage, CodeRemoveImage } from '@onlook/models/actions';
import { DefaultSettings } from '@onlook/constants';

import type { NodePath, T } from '../packages';
import { addClassToNode } from './style';

export function insertImageToNode(path: NodePath<T.JSXElement>, action: CodeInsertImage): void {
    const imageName = writeImageToFile(action);
    if (!imageName) {
        console.error('Failed to write image to file');
        return;
    }
    const url = imageName.replace(new RegExp(`^${DefaultSettings.IMAGE_FOLDER}\/`), '');
    const backgroundClass = `bg-[url(/${url})]`;
    addClassToNode(path.node, backgroundClass);
}

function writeImageToFile(action: CodeInsertImage): string | null {
    // TODO: Implement
    return null;
}

export function removeImageFromNode(path: NodePath<T.JSXElement>, action: CodeRemoveImage): void { }
