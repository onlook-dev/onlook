import { DisplayDirection, findInsertionIndex, getDisplayDirection } from './helpers';
import { EditorAttributes } from '/common/constants';

export function createStub(el: HTMLElement) {
    const stub = document.createElement('div');
    const styles = window.getComputedStyle(el);

    stub.id = EditorAttributes.ONLOOK_STUB_ID;
    stub.style.width = styles.width;
    stub.style.height = styles.height;
    stub.style.margin = styles.margin;
    stub.style.padding = styles.padding;
    stub.style.borderRadius = styles.borderRadius;
    stub.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
    stub.style.display = 'none';

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

    // Get the display property of the parent
    const parentDisplay = window.getComputedStyle(parent).display;

    let displayDirection = el.getAttribute(EditorAttributes.DATA_ONLOOK_DRAG_DIRECTION);
    if (!displayDirection) {
        displayDirection = getDisplayDirection(parent);
    }

    const siblings = Array.from(parent.children).filter((child) => child !== el && child !== stub);

    let insertionIndex: number;

    if (parentDisplay === 'grid') {
        // Handle grid layout
        insertionIndex = findGridInsertionIndex(parent, siblings, x, y);
    } else {
        // Existing logic for flex and block layouts
        insertionIndex = findInsertionIndex(siblings, x, y, displayDirection as DisplayDirection);
    }

    stub.remove();
    if (insertionIndex >= siblings.length) {
        parent.appendChild(stub);
    } else {
        parent.insertBefore(stub, siblings[insertionIndex]);
    }
    stub.style.display = 'block';

    if (parentDisplay === 'grid') {
        // Adjust stub position for grid layout
        adjustStubPositionForGrid(stub, parent);
    }
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

function findGridInsertionIndex(parent: HTMLElement, siblings: Element[], x: number, y: number): number {
    const gridComputedStyle = window.getComputedStyle(parent);
    const columns = gridComputedStyle.gridTemplateColumns.split(' ').length;
    const rows = gridComputedStyle.gridTemplateRows.split(' ').length;

    const parentRect = parent.getBoundingClientRect();
    const relativeX = x - parentRect.left;
    const relativeY = y - parentRect.top;

    const cellWidth = parentRect.width / columns;
    const cellHeight = parentRect.height / rows;

    const targetColumn = Math.floor(relativeX / cellWidth);
    const targetRow = Math.floor(relativeY / cellHeight);

    const targetIndex = targetRow * columns + targetColumn;
    return Math.min(targetIndex, siblings.length);
}

function adjustStubPositionForGrid(stub: HTMLElement, parent: HTMLElement) {
    const gridComputedStyle = window.getComputedStyle(parent);
    const columns = gridComputedStyle.gridTemplateColumns.split(' ').length;
    const rows = gridComputedStyle.gridTemplateRows.split(' ').length;

    const siblings = Array.from(parent.children);
    const stubIndex = siblings.indexOf(stub);

    const targetRow = Math.floor(stubIndex / columns);
    const targetColumn = stubIndex % columns;

    stub.style.gridRowStart = `${targetRow + 1}`;
    stub.style.gridColumnStart = `${targetColumn + 1}`;
    stub.style.gridRowEnd = 'auto';
    stub.style.gridColumnEnd = 'auto';
}
