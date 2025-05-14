import { EditorAttributes } from '@onlook/constants';
import { customAlphabet } from 'nanoid';

export const VALID_DATA_ATTR_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-._:';

const generateCustomId = customAlphabet(VALID_DATA_ATTR_CHARS, 7);

export function createDomId(): string {
    return `odid-${generateCustomId()}`;
}

export function createOid(): string {
    return `${generateCustomId()}`;
}

export function getOid(node: HTMLElement): string | undefined {
    return node.getAttribute(EditorAttributes.DATA_ONLOOK_ID) as string;
}

export function getInstanceId(node: HTMLElement): string | undefined {
    return node.getAttribute(EditorAttributes.DATA_ONLOOK_INSTANCE_ID) as string;
}

export function getDomId(node: HTMLElement): string | undefined {
    return node.getAttribute(EditorAttributes.DATA_ONLOOK_DOM_ID) as string;
}
