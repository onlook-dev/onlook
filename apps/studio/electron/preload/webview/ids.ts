import { EditorAttributes } from '@onlook/models/constants';
import { uuid } from './bundles';

export function getOrAssignDomId(node: HTMLElement): string {
    let domId = node.getAttribute(EditorAttributes.DATA_ONLOOK_DOM_ID) as string;
    if (!domId) {
        domId = `odid-${uuid()}`;
        node.setAttribute(EditorAttributes.DATA_ONLOOK_DOM_ID, domId);
    }
    return domId;
}
