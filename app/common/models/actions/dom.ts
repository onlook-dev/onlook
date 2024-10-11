import { ActionElementLocation } from '.';
import { InsertPos } from '..';
import { TemplateNode } from '../element/templateNode';

export enum DomActionType {
    MOVE = 'move-element',
    INSERT = 'insert-element',
}

export interface DomActionElement {
    type: DomActionType;
    selector: string;
    location: ActionElementLocation;
}

export interface ActionMoveLocation extends ActionElementLocation {
    position: InsertPos.INDEX;
    targetSelector: string;
    index: number;
}

export interface MovedElement extends DomActionElement {
    type: DomActionType.MOVE;
    location: ActionMoveLocation;
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
    selector: string;
    children: InsertedElement[];
    attributes: Record<string, string>;
    textContent?: string;
}
