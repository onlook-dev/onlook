import { InsertPos } from '..';
import { ActionElementLocation } from '/common/actions';

export interface InsertedElement {
    tagName: string;
    selector: string;
    location: ActionElementLocation;
}
