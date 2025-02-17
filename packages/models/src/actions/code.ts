import {
    type GroupContainer,
    type InsertImageAction,
    type PasteParams,
    type RemoveImageAction,
} from './action';
import { type ActionLocation, type IndexActionLocation } from './location';
import { type ActionTarget } from './target';

export enum CodeActionType {
    MOVE = 'move',
    INSERT = 'insert',
    REMOVE = 'remove',
    GROUP = 'group',
    UNGROUP = 'ungroup',
    INSERT_IMAGE = 'insert-image',
    REMOVE_IMAGE = 'remove-image',
}

export interface BaseCodeAction {
    type: CodeActionType;
    location: ActionLocation;
    oid: string;
}

export interface BaseCodeInsert extends BaseCodeAction {
    type: CodeActionType.INSERT;
    tagName: string;
    attributes: Record<string, string>;
    textContent: string | null;
    pasteParams: PasteParams | null;
    codeBlock: string | null;
}

export interface CodeInsert extends BaseCodeInsert {
    children: CodeInsert[];
}

export interface CodeRemove {
    type: CodeActionType.REMOVE;
    oid: string;
    codeBlock: string | null;
}

export interface CodeStyle {
    oid: string;
    styles: Record<string, string>;
}

export interface CodeEditText {
    oid: string;
    content: string;
}

export interface CodeMove extends BaseCodeAction {
    type: CodeActionType.MOVE;
    location: IndexActionLocation;
}

export interface BaseCodeGroup {
    oid: string;
    container: GroupContainer;
    children: ActionTarget[];
}

export interface CodeGroup extends BaseCodeGroup {
    type: CodeActionType.GROUP;
}

export interface CodeUngroup extends BaseCodeGroup {
    type: CodeActionType.UNGROUP;
}

export interface CodeInsertImage extends InsertImageAction {
    type: CodeActionType.INSERT_IMAGE;
    folderPath: string;
}

export interface CodeRemoveImage extends RemoveImageAction {
    type: CodeActionType.REMOVE_IMAGE;
}

export type CodeAction =
    | CodeMove
    | CodeInsert
    | CodeRemove
    | CodeGroup
    | CodeUngroup
    | CodeInsertImage
    | CodeRemoveImage;
