import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { type CodeInsertImage, type CodeRemoveImage } from '@onlook/models/actions';
import { DefaultSettings } from '@onlook/models/constants';
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
        const imagePath = join(imageFolder, action.image.fileName);
        writeFile(imagePath, action.image.content, 'base64');
        return action.image.fileName;
    } catch (error) {
        console.error('Failed to write image to file', error);
        return null;
    }
}

export function removeImageFromNode(path: NodePath<t.JSXElement>, action: CodeRemoveImage): void {}
