import { formatHex, parse } from 'culori';

export function stringToHex(str: string): string {
    if (!str || str === '') {
        return '';
    }

    const color = parse(str);
    if (!color || color.alpha === 0) {
        return '';
    }
    return formatHex(color);
}

export function formatColorInput(colorInput: string): string {
    if (/^[0-9A-F]{6}$/i.test(colorInput)) {
        return '#' + colorInput;
    }
    return colorInput;
}
