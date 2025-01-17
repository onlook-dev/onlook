import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { type CodeInsertImage, type CodeRemoveImage } from '@onlook/models/actions';
import { nanoid } from 'nanoid';
import { join } from 'path';
import { writeFile } from '../files';

export function insertImageToNode(path: NodePath<t.JSXElement>, action: CodeInsertImage): void {
    // TODO: Implement this
    // Create and insert image into public folder
    const imagePath = writeImageToFile(action);
    if (!imagePath) {
        console.error('Failed to write image to file');
        return;
    }
    console.log('imagePath', imagePath);
    // Insert image into node
    console.log('insertImageToNode', action);
}

function writeImageToFile(action: CodeInsertImage): string | null {
    try {
        const imageName = `${nanoid(4)}.${mimeTypeToExtension(action.mimeType)}`;
        const imagePath = join(action.folderPath, imageName);
        writeFile(imagePath, action.image, 'base64');
        return imagePath;
    } catch (error) {
        console.error('Failed to write image to file', error);
        return null;
    }
}

export function removeImageFromNode(path: NodePath<t.JSXElement>, action: CodeRemoveImage): void {
    // TODO: Implement this
    console.log('removeImageFromNode', action);
}

function mimeTypeToExtension(mimeType: string): string {
    try {
        return mimeType.split('/')[1];
    } catch (error) {
        console.error('Failed to convert mimeType to extension', mimeType);
        return 'png';
    }
}
