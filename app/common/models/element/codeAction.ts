import { InsertPos } from '..';
import { TemplateNode } from './templateNode';
import { ActionElementLocation, MoveActionLocation } from '/common/actions';

export enum CodeActionType {
    MOVE = 'move-element',
    INSERT = 'insert-element',
    REMOVE = 'remove-element',
}

interface BaseCodeActionElement {
    type: CodeActionType;
    location: ActionElementLocation;
}

export interface ActionMoveLocation extends ActionElementLocation {
    position: InsertPos.INDEX;
    targetSelector: string;
    index: number;
}

export interface MovedElement extends BaseCodeActionElement {
    selector: string;
    type: CodeActionType.MOVE;
    location: MoveActionLocation;
}

export interface MovedElementWithTemplate extends MovedElement {
    templateNode: TemplateNode;
}

export interface TextEditedElement {
    selector: string;
    content: string;
}

export interface InsertedElement extends BaseCodeActionElement {
    type: CodeActionType.INSERT;
    tagName: string;
    children: InsertedElement[];
    attributes: Record<string, string>;
    textContent?: string;
    codeBlock?: string;
}

export interface RemovedElement extends BaseCodeActionElement {
    type: CodeActionType.REMOVE;
    codeBlock?: string;
}

export interface StyleChange {
    selector: string;
    styles: Record<string, string>;
}

export type CodeActionElement = MovedElement | InsertedElement | RemovedElement;
