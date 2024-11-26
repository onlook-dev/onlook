import { EditorAttributes } from '@onlook/models/constants';
export const VALID_DATA_ATTR_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-._:';

export function getOid(node: HTMLElement): string | undefined {
    return node.getAttribute(EditorAttributes.DATA_ONLOOK_ID) as string;
}

export function getInstanceId(node: HTMLElement): string | undefined {
    return node.getAttribute(EditorAttributes.DATA_ONLOOK_INSTANCE_ID) as string;
}
