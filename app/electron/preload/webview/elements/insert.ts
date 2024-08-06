import { getDeepElement } from './helpers';

export function insertElement(x: number, y: number, width: number, height: number) {
    console.log('Inserting element at', x, y, width, height);
    const el = getDeepElement(x, y) as HTMLElement | undefined;
    if (!el) {
        return;
    }
    const newDiv = document.createElement('div');
    newDiv.style.width = `${width}px`;
    newDiv.style.height = `${height}px`;
    newDiv.style.backgroundColor = 'gray';
    el.appendChild(newDiv);
}
