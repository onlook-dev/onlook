import { getDomElement } from '../helpers';
import { moveElToIndex } from './helpers';
import { DomElement } from '/common/models/element';

export function moveElement(selector: string, newIndex: number): DomElement | undefined {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
        console.error(`Move element not found: ${selector}`);
        return;
    }
    const movedEl = moveElToIndex(el, newIndex);
    if (!movedEl) {
        console.error(`Failed to move element: ${selector}`);
        return;
    }
    const domEl = getDomElement(movedEl, true);
    return domEl;
}
