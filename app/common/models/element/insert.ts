import { ActionElementLocation } from '/common/actions';

export interface InsertedChild {
    tagName: string;
    selector: string;
    children: InsertedChild[];
}
export interface InsertedElement extends InsertedChild {
    location: ActionElementLocation;
}
