import { type GroupContainer, type PasteParams } from './action';
import { type ActionLocation, type IndexActionLocation } from './location';
import { type ActionTarget } from './target';

export enum CodeActionType {
    MOVE = 'move',
    INSERT = 'insert',
    REMOVE = 'remove',
    GROUP = 'group',
    UNGROUP = 'ungroup',
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
}

export interface CodeInsert extends BaseCodeInsert {
    children: CodeInsert[];
}

export interface CodeRemove {
    type: CodeActionType.REMOVE;
    oid: string;
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

export type CodeAction = CodeMove | CodeInsert | CodeRemove | CodeGroup | CodeUngroup;
