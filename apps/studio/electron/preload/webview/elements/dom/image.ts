import cssManager from '../../style';

export function insertImage(domId: string, image: string) {
    cssManager.updateStyle(domId, { backgroundImage: `url(${image})` });
}

export function removeImage(domId: string) {
    cssManager.updateStyle(domId, { backgroundImage: 'none' });
}
