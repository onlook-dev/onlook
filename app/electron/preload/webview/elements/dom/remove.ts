import { getElementLocation } from '../helpers';
import { getActionElement } from './helpers';
import { RemoveElementAction } from '/common/models/actions';

export function getRemoveActionFromSelector(
    selector: string,
    webviewId: string,
): RemoveElementAction | undefined {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
        return;
    }

    const location = getElementLocation(el);
    if (!location) {
        return;
    }

    const actionEl = getActionElement(el);

    return {
        type: 'remove-element',
        targets: [{ webviewId }],
        location: location,
        element: actionEl,
    };
}
