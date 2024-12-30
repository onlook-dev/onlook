import type { CodeDiff } from '../code';
import { type ActionLocation, type IndexActionLocation } from './location';
import { type ActionTarget, type StyleActionTarget } from './target';

interface BaseActionElement {
    domId: string;
    oid: string;
    tagName: string;
    attributes: Record<string, string>;
    styles: Record<string, string>;
    textContent: string | null;
}

export interface ActionElement extends BaseActionElement {
    children: ActionElement[];
}

export interface UpdateStyleAction {
    type: 'update-style';
    targets: StyleActionTarget[];
    style: string;
}

export interface PasteParams {
    oid: string;
    domId: string;
    codeBlock: string | null;
}

// Reversible insert and remove actions
interface BaseInsertRemoveAction {
    type: string;
    targets: ActionTarget[];
    location: ActionLocation;
    element: ActionElement;
    editText: boolean | null;
    pasteParams: PasteParams | null;
}

export interface InsertElementAction extends BaseInsertRemoveAction {
    type: 'insert-element';
}

export interface RemoveElementAction extends BaseInsertRemoveAction {
    type: 'remove-element';
}

export interface MoveElementAction {
    type: 'move-element';
    targets: ActionTarget[];
    location: IndexActionLocation;
}

export interface EditTextAction {
    type: 'edit-text';
    targets: ActionTarget[];
    originalContent: string;
    newContent: string;
}

export interface GroupContainer {
    domId: string;
    oid: string;
    tagName: string;
    attributes: Record<string, string>;
}

// Reversible group and ungroup actions
export interface BaseGroupAction {
    type: string;
    parent: ActionTarget;
    children: ActionTarget[];
    container: GroupContainer;
}

export interface GroupElementsAction extends BaseGroupAction {
    type: 'group-elements';
}

export interface UngroupElementsAction extends BaseGroupAction {
    type: 'ungroup-elements';
}

export interface WriteCodeAction {
    type: 'write-code';
    diffs: CodeDiff[];
}

export type Action =
    | UpdateStyleAction
    | InsertElementAction
    | RemoveElementAction
    | MoveElementAction
    | EditTextAction
    | GroupElementsAction
    | UngroupElementsAction
    | WriteCodeAction;
