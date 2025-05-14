import { EditorAttributes } from '@onlook/constants';
import { nanoid } from 'nanoid/non-secure';

export function getOrAssignDomId(node: HTMLElement): string {
    let domId = node.getAttribute(EditorAttributes.DATA_ONLOOK_DOM_ID) as string;
    if (!domId) {
        domId = `odid-${nanoid()}`;
        node.setAttribute(EditorAttributes.DATA_ONLOOK_DOM_ID, domId);
    }
    return domId;
}

export const VALID_DATA_ATTR_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-._:';

export function getOid(node: HTMLElement): string | undefined {
    return node.getAttribute(EditorAttributes.DATA_ONLOOK_ID) as string;
}

export function getInstanceId(node: HTMLElement): string | undefined {
    return node.getAttribute(EditorAttributes.DATA_ONLOOK_INSTANCE_ID) as string;
}
