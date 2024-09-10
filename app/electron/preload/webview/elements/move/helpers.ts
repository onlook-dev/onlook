import { ipcRenderer } from 'electron';
import { buildLayerTree } from '../../dom';
import { getDomElement } from '../helpers';
import { WebviewChannels } from '/common/constants';

export enum DisplayDirection {
    VERTICAL = 'vertical',
    HORIZONTAL = 'horizontal',
}

export function getDisplayDirection(element: HTMLElement): DisplayDirection {
    if (!element || !element.children || element.children.length < 2) {
        return DisplayDirection.VERTICAL;
    }

    const children = Array.from(element.children);
    const firstChild = children[0];
    const secondChild = children[1];

    const firstRect = firstChild.getBoundingClientRect();
    const secondRect = secondChild.getBoundingClientRect();

    if (Math.abs(firstRect.left - secondRect.left) < Math.abs(firstRect.top - secondRect.top)) {
        return DisplayDirection.VERTICAL;
    } else {
        return DisplayDirection.HORIZONTAL;
    }
}

export function findInsertionIndex(
    elements: Element[],
    x: number,
    y: number,
    displayDirection: DisplayDirection,
): number {
    const midPoints = elements.map((el) => {
        const rect = el.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };
    });

    for (let i = 0; i < midPoints.length; i++) {
        if (displayDirection === DisplayDirection.VERTICAL) {
            if (y < midPoints[i].y) {
                return i;
            }
        } else {
            if (x < midPoints[i].x) {
                return i;
            }
        }
    }
    return elements.length;
}

export function publishMoveEvent(el: HTMLElement) {
    const domEl = getDomElement(el, true);
    const parent = el.parentElement;
    const parentLayerNode = parent ? buildLayerTree(parent as HTMLElement) : null;
    if (domEl && parentLayerNode) {
        ipcRenderer.sendToHost(WebviewChannels.ELEMENT_MOVED, { domEl, parentLayerNode });
    }
}

export function moveElToIndex(el: HTMLElement, newIndex: number): HTMLElement | undefined {
    const parent = el.parentElement;
    if (!parent) {
        return;
    }
    parent.removeChild(el);
    if (newIndex >= parent.children.length) {
        parent.appendChild(el);
        return el;
    }

    const referenceNode = parent.children[newIndex];
    parent.insertBefore(el, referenceNode);
    return el;
}
