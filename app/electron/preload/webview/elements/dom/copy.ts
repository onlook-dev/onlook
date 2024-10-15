import { uuid } from '../../bundles';
import { getActionElement } from './helpers';
import { EditorAttributes } from '/common/constants';
import { ActionElement } from '/common/models/actions';

export function copyElementBySelector(selector: string): ActionElement | null {
    const el = document.querySelector(selector) as HTMLElement;

    if (!el) {
        console.error('Element not found for selector:', selector);
        return null;
    }

    const actionElement = getActionElement(el);
    const newUuid = uuid();
    actionElement.uuid = newUuid;
    actionElement.attributes[EditorAttributes.DATA_ONLOOK_UNIQUE_ID] = newUuid;
    return actionElement;
}
