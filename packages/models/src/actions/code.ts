import {
    type ActionElementLocation,
    ActionTarget,
    type GroupActionTarget,
    type MoveActionLocation,
} from '.';
import type { InsertPos } from '../editor';
import type { TemplateNode } from '../element/templateNode';

export enum CodeActionType {
    MOVE = 'move',
    INSERT = 'insert',
    REMOVE = 'remove',
    GROUP = 'group',
    UNGROUP = 'ungroup',
}

interface BaseCodeAction {
    type: CodeActionType;
    location: ActionElementLocation;
    uuid: string;
}

export interface IndexMoveLocation extends ActionElementLocation {
    position: InsertPos.INDEX;
    targetSelector: string;
    index: number;
}

export interface CodeMove extends BaseCodeAction {
    selector: string;
    type: CodeActionType.MOVE;
    location: MoveActionLocation;
    childTemplateNode: TemplateNode;
}

export interface CodeEditText {
    selector: string;
    content: string;
}

export interface CodeInsert extends BaseCodeAction {
    type: CodeActionType.INSERT;
    tagName: string;
    children: CodeInsert[];
    attributes: Record<string, string>;
    textContent?: string;
    codeBlock?: string;
}

export interface CodeRemove extends BaseCodeAction {
    type: CodeActionType.REMOVE;
    codeBlock?: string;
}

export interface CodeStyle {
    selector: string;
    styles: Record<string, string>;
}

export interface BaseGroupAction extends BaseCodeAction {
    location: ActionElementLocation;
    container: CodeInsert;
    targets: GroupActionTarget[];
}

export interface CodeGroup extends BaseGroupAction {
    type: CodeActionType.GROUP;
}

export interface CodeUngroup extends BaseGroupAction {
    type: CodeActionType.UNGROUP;
}

export type CodeAction = CodeMove | CodeInsert | CodeRemove | CodeGroup | CodeUngroup;
