import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { type CodeInsertImage, type CodeRemoveImage } from '@onlook/models/actions';
import { DefaultSettings } from '@onlook/models/constants';
import { nanoid } from 'nanoid';
import { join } from 'path';
import { writeFile } from '../files';
import { addClassToNode } from './style';

export function insertImageToNode(path: NodePath<t.JSXElement>, action: CodeInsertImage): void {
    const imageName = writeImageToFile(action);
    if (!imageName) {
        console.error('Failed to write image to file');
        return;
    }
    const prefix = DefaultSettings.IMAGE_FOLDER.replace(/^public\//, '');
    const backgroundClass = `bg-[url(/${prefix}/${imageName})]`;
    addClassToNode(path.node, backgroundClass);
}

function writeImageToFile(action: CodeInsertImage): string | null {
    try {
        const imageFolder = `${action.folderPath}/${DefaultSettings.IMAGE_FOLDER}`;
        const imageName = `${nanoid(4)}.${mimeTypeToExtension(action.mimeType)}`;
        const imagePath = join(imageFolder, imageName);
        writeFile(imagePath, action.image, 'base64');
        return imageName;
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
