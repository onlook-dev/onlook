import { type Change, type DomElement, type StyleChange } from '@onlook/models';

import { getElementByDomId } from '../elements';
import { cssManager } from './css-manager';

export function updateStyle(
    domId: string,
    change: Change<Record<string, StyleChange>>,
): DomElement | null {
    cssManager.updateStyle(domId, change.updated);
    return getElementByDomId(domId, true);
}
