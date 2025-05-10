import { EditorAttributes } from '@onlook/constants';
import {
    DisplayDirection,
    findInsertionIndex as findFlexBlockInsertionIndex,
    findGridInsertionIndex,
    getDisplayDirection,
} from './helpers';

export function createStub(el: HTMLElement) {
    const stub = document.createElement('div');
    const styles = window.getComputedStyle(el);
    const className = el.className;

    stub.id = EditorAttributes.ONLOOK_STUB_ID;
    stub.style.width = styles.width;
    stub.style.height = styles.height;
    stub.style.margin = styles.margin;
    stub.style.padding = styles.padding;
    stub.style.borderRadius = styles.borderRadius;
    stub.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
    stub.style.display = 'none';
    stub.className = className;
    document.body.appendChild(stub);
}

export function moveStub(el: HTMLElement, x: number, y: number) {
    const stub = document.getElementById(EditorAttributes.ONLOOK_STUB_ID);
    if (!stub) {
        return;
    }

    const parent = el.parentElement;
    if (!parent) {
        return;
    }

    let displayDirection = el.getAttribute(EditorAttributes.DATA_ONLOOK_DRAG_DIRECTION);
    if (!displayDirection) {
        displayDirection = getDisplayDirection(parent);
    }

    const parentStyle = window.getComputedStyle(parent);
    const isGridLayout = parentStyle.display === 'grid';
    const isFlexRow = !isGridLayout && parentStyle.display === 'flex' &&
        (parentStyle.flexDirection === 'row' || parentStyle.flexDirection === '');

    if (isFlexRow) {
        displayDirection = DisplayDirection.HORIZONTAL;
    }

    const siblings = Array.from(parent.children).filter((child) => child !== el && child !== stub);

    let insertionIndex;
    if (isGridLayout) {
        insertionIndex = findGridInsertionIndex(parent, siblings, x, y);
    } else {
        insertionIndex = findFlexBlockInsertionIndex(
            siblings,
            x,
            y,
            displayDirection as DisplayDirection,
        );
    }

    stub.remove();

    if (insertionIndex >= siblings.length) {
        parent.appendChild(stub);
    } else {
        parent.insertBefore(stub, siblings[insertionIndex] ?? null);
    }

    stub.style.display = 'block';
}

export function removeStub() {
    const stub = document.getElementById(EditorAttributes.ONLOOK_STUB_ID);
    if (!stub) {
        return;
    }
    stub.remove();
}

export function getCurrentStubIndex(parent: HTMLElement, el: HTMLElement): number {
    const stub = document.getElementById(EditorAttributes.ONLOOK_STUB_ID);
    if (!stub) {
        return -1;
    }

    const siblings = Array.from(parent.children).filter((child) => child !== el);
    return siblings.indexOf(stub);
}
