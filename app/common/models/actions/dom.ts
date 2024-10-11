import { ActionElementLocation } from '.';
import { InsertPos } from '..';

export enum DomActionType {
    MOVE = 'move-element',
    INSERT = 'insert-element',
}

interface DomActionElement {
    type: DomActionType;
    selector: string;
    location: ActionElementLocation;
}

export interface ActionMoveLocation extends ActionElementLocation {
    position: InsertPos.INDEX;
    targetSelector: string;
    index: number;
}

export interface DomMove extends DomActionElement {
    type: DomActionType.MOVE;
    location: ActionMoveLocation;
}

export interface DomInsert extends DomActionElement {
    type: DomActionType.INSERT;
    tagName: string;
    selector: string;
    children: DomInsert[];
    attributes: Record<string, string>;
    textContent?: string;
}
