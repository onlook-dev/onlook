import { DisplayDirection, findInsertionIndex, getDisplayDirection } from './helpers';
import { EditorAttributes } from '/common/constants';

interface StubMeta {
    originalIndex: number;
    originalParent: HTMLElement;
}

// Store metadata about the original position
const stubMetadata: { [key: string]: StubMeta } = {};

// Function to generate unique ID for each stub
function generateUniqueStubId(): string {
    return `stub-${Math.random().toString(36).substr(2, 9)}`;
}

export function createStub(el: HTMLElement) {
    const stub = document.createElement('div');
    const styles = window.getComputedStyle(el);

    const stubId = generateUniqueStubId();
    stub.id = stubId;
    stub.style.width = styles.width;
    stub.style.height = styles.height;
    stub.style.margin = styles.margin;
    stub.style.padding = styles.padding;
    stub.style.borderRadius = styles.borderRadius;
    stub.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
    stub.style.display = 'none';

    // Store the original position information
    const parent = el.parentElement;
    if (parent) {
        const siblings = Array.from(parent.children);
        const originalIndex = siblings.indexOf(el);
        stubMetadata[stub.id] = {
            originalIndex,
            originalParent: parent
        };
    }

    document.body.appendChild(stub);
}

export function moveStub(el: HTMLElement, x: number, y: number) {
    const stubId = Object.keys(stubMetadata)[0]; // Get the first stub ID (assuming only one active at a time)
    const stub = document.getElementById(stubId);
    if (!stub) return;

    const parent = el.parentElement;
    if (!parent) return;

    // Get the display property of the parent
    const parentDisplay = window.getComputedStyle(parent).display;

    let displayDirection = el.getAttribute(EditorAttributes.DATA_ONLOOK_DRAG_DIRECTION);
    if (!displayDirection) {
        displayDirection = getDisplayDirection(parent);
    }

    const siblings = Array.from(parent.children).filter((child) => child !== el && child !== stub);
    const meta = stubMetadata[stub.id];

    // Check if we're near the original position
    if (meta && parent === meta.originalParent) {
        const mouseNearOriginal = isMouseNearOriginalPosition(parent, meta.originalIndex, x, y);
        if (mouseNearOriginal) {
            placeStubAtOriginalPosition(stub, parent, meta.originalIndex, siblings);
            return;
        }
    }

    let insertionIndex: number;

    if (parentDisplay === 'grid') {
        insertionIndex = findGridInsertionIndex(parent, siblings, x, y);
    } else {
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
        adjustStubPositionForGrid(stub, parent);
    }
}

export function removeStub() {
    const stubId = Object.keys(stubMetadata)[0]; // Get the first stub ID (assuming only one active at a time)
    const stub = document.getElementById(stubId);
    if (!stub) return;

    stub.remove();
    delete stubMetadata[stubId];
}

export function getCurrentStubIndex(parent: HTMLElement, el: HTMLElement): number {
    const stubId = Object.keys(stubMetadata)[0]; // Get the first stub ID (assuming only one active at a time)
    const stub = document.getElementById(stubId);
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

    const siblings = Array.from(parent.children);
    const stubIndex = siblings.indexOf(stub);

    const targetRow = Math.floor(stubIndex / columns);
    const targetColumn = stubIndex % columns;

    stub.style.gridRowStart = `${targetRow + 1}`;
    stub.style.gridColumnStart = `${targetColumn + 1}`;
    stub.style.gridRowEnd = 'auto';
    stub.style.gridColumnEnd = 'auto';
}

function isMouseNearOriginalPosition(parent: HTMLElement, originalIndex: number, x: number, y: number): boolean {
    const children = Array.from(parent.children);
    const originalElement = children[originalIndex];
    if (!originalElement) return false;

    const rect = originalElement.getBoundingClientRect();
    const threshold = 20; // pixels

    return (
        x >= rect.left - threshold &&
        x <= rect.right + threshold &&
        y >= rect.top - threshold &&
        y <= rect.bottom + threshold
    );
}

function placeStubAtOriginalPosition(stub: HTMLElement, parent: HTMLElement, originalIndex: number, siblings: Element[]) {
    stub.remove();
    if (originalIndex >= siblings.length) {
        parent.appendChild(stub);
    } else {
        parent.insertBefore(stub, siblings[originalIndex]);
    }
    stub.style.display = 'block';

    if (window.getComputedStyle(parent).display === 'grid') {
        adjustStubPositionForGrid(stub, parent);
    }
}
