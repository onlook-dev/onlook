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

    let displayDirection = el.getAttribute(EditorAttributes.DATA_ONLOOK_DRAG_DIRECTION);
    if (!displayDirection) {
        displayDirection = getDisplayDirection(parent);
    }

    // Check if the parent is using grid layout
    const parentStyle = window.getComputedStyle(parent);
    const isGridLayout = parentStyle.display === 'grid';

    const siblings = Array.from(parent.children).filter((child) => child !== el && child !== stub);
    
    let insertionIndex;
    if (isGridLayout) {
        // Handle grid layout
        insertionIndex = findGridInsertionIndex(parent, siblings, x, y);
    } else {
        // Existing logic for flex and block layouts
        insertionIndex = findInsertionIndex(siblings, x, y, displayDirection as DisplayDirection);
    }

    stub.remove();
    
    // Allow placing the element back to its original position
    const originalIndex = Array.from(parent.children).indexOf(el);
    if (insertionIndex === originalIndex || insertionIndex === originalIndex + 1) {
        parent.insertBefore(stub, el);
    } else if (insertionIndex >= siblings.length) {
        parent.appendChild(stub);
    } else {
        parent.insertBefore(stub, siblings[insertionIndex]);
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

// New function to handle grid insertion index calculation
function findGridInsertionIndex(parent: HTMLElement, siblings: Element[], x: number, y: number): number {
    const parentRect = parent.getBoundingClientRect();
    const gridComputedStyle = window.getComputedStyle(parent);
    const columns = gridComputedStyle.gridTemplateColumns.split(' ').length;
    const rows = gridComputedStyle.gridTemplateRows.split(' ').length;

    const cellWidth = parentRect.width / columns;
    const cellHeight = parentRect.height / rows;

    const gridX = Math.floor((x - parentRect.left) / cellWidth);
    const gridY = Math.floor((y - parentRect.top) / cellHeight);

    const targetIndex = gridY * columns + gridX;
    return Math.min(Math.max(targetIndex, 0), siblings.length);
}
