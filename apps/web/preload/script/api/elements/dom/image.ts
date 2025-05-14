import { StyleChangeType } from '@onlook/models/style';
import { cssManager } from '../../style';

export function insertImage(domId: string, image: string) {
    cssManager.updateStyle(domId, {
        backgroundImage: { value: `url(${image})`, type: StyleChangeType.Value },
    });
}

export function removeImage(domId: string) {
    cssManager.updateStyle(domId, {
        backgroundImage: { value: 'none', type: StyleChangeType.Value },
    });
}
