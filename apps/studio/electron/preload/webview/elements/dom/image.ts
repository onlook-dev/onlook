import cssManager from '../../style';

export function insertImage(domId: string, image: string, styles: Record<string, string>) {
    cssManager.updateStyle(domId, 'backgroundImage', `url(${image})`);
    Object.entries(styles).forEach(([key, value]) => {
        cssManager.updateStyle(domId, key, value);
    });
}

export function removeImage(domId: string) {
    cssManager.updateStyle(domId, 'backgroundImage', '');
}
