import { InsertPos } from '..';
import { TemplateNode } from './templateNode';
import { ActionElementLocation, MoveActionLocation } from '/common/actions';

export enum DomActionType {
    MOVE = 'move-element',
    INSERT = 'insert-element',
}

export interface DomActionElement {
    type: DomActionType;
    location: ActionElementLocation;
}

export interface ActionMoveLocation extends ActionElementLocation {
    position: InsertPos.INDEX;
    targetSelector: string;
    index: number;
}

export interface MovedElement extends DomActionElement {
    selector: string;
    type: DomActionType.MOVE;
    location: MoveActionLocation;
}

export interface MovedElementWithTemplate extends MovedElement {
    templateNode: TemplateNode;
}

export interface TextEditedElement {
    selector: string;
    content: string;
}

export interface InsertedElement extends DomActionElement {
    type: DomActionType.INSERT;
    tagName: string;
    children: InsertedElement[];
    attributes: Record<string, string>;
    textContent?: string;
}

export interface StyleChange {
    selector: string;
    styles: Record<string, string>;
}
