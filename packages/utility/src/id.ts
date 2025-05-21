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

/**
 * Shortens a UUID; maintains uniqueness probabilistically (collisions are possible).
 */

export function shortenUuid(uuid: string, maxLength: number): string {
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
        const char = uuid.charCodeAt(i);
        hash = (hash << 5) - hash + char;
    }

    // Convert to base36 (alphanumeric) for compact representation
    const base36 = Math.abs(hash).toString(36);

    // Pad with leading zeros if needed
    const padded = base36.padStart(maxLength, '0');

    // Truncate if longer than maxLength
    return padded.slice(-maxLength);
}
