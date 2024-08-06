import { getDeepElement } from './helpers';

export function insertElement(x: number, y: number, width: number, height: number) {
    const el = getDeepElement(x, y) as HTMLElement | undefined;
    if (!el) {
        return;
    }
    const newDiv = createNewDiv(width, height);
    el.appendChild(newDiv);
}

function createNewDiv(width: number, height: number) {
    const newDiv = document.createElement('div');
    newDiv.style.width = `${width}px`;
    newDiv.style.height = `${height}px`;
    newDiv.style.backgroundColor = 'rgba(0, 0, 255, 0.5)';
    return newDiv;
}
