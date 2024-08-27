import { InsertPos } from '..';
import { ActionElementLocation } from '/common/actions';

export interface DomActionElement {
    timestamp: number;
    selector: string;
    location: ActionElementLocation;
}

export interface ActionMoveLocation extends ActionElementLocation {
    position: InsertPos.INDEX;
    targetSelector: string;
    index: number;
}

export interface MovedElement extends DomActionElement {
    location: ActionMoveLocation;
}

export interface InsertedElement extends DomActionElement {
    tagName: string;
    selector: string;
    children: InsertedElement[];
    attributes: Record<string, string>;
}
