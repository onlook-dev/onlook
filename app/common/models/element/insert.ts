import { ActionElementLocation } from '/common/actions';

export interface InsertedChild {
    tagName: string;
    selector: string;
    children: InsertedChild[];
    attributes: Record<string, string>;
    timestamp: number;
}

export interface InsertedElement extends InsertedChild {
    location: ActionElementLocation;
}
