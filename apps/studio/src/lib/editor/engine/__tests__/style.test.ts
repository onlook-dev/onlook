import { beforeEach, describe, expect, test } from 'bun:test';
import { getTailwindClassChangeFromStyle } from '../code/helpers';
import {
    DisplayDirection,
    getDisplayDirection,
} from '../../../../../electron/preload/webview/elements/move/helpers';

// Mock DOM elements and methods
class MockElement {
    children: MockElement[] = [];
    getBoundingClientRect: () => DOMRect;

    constructor(rect: Partial<DOMRect>) {
        this.getBoundingClientRect = () => ({
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            width: 0,
            height: 0,
            x: 0,
            y: 0,
            toJSON: () => ({}),
            ...rect,
        });
    }

    appendChild(child: MockElement) {
        this.children.push(child);
    }
}

describe('Flexbox Direction Detection and Class Handling', () => {
    test('getTailwindClassChangeFromStyle removes block class when applying flex', () => {
        const request = {
            oid: 'test-oid',
            attributes: { className: 'block text-red-500 p-4' },
            textContent: null,
            insertedElements: [],
            movedElements: [],
            removedElements: [],
            groupElements: [],
            ungroupElements: [],
            overrideClasses: null,
        };

        getTailwindClassChangeFromStyle(request, { display: 'flex' });
        expect(request.attributes.className).not.toContain('block');
        expect(request.attributes.className).toContain('flex');
    });

    test('getTailwindClassChangeFromStyle preserves color classes when applying flex', () => {
        const request = {
            oid: 'test-oid',
            attributes: { className: 'block text-red-500 bg-blue-500' },
            textContent: null,
            insertedElements: [],
            movedElements: [],
            removedElements: [],
            groupElements: [],
            ungroupElements: [],
            overrideClasses: null,
        };

        getTailwindClassChangeFromStyle(request, { display: 'flex' });
        expect(request.attributes.className).toContain('text-red-500');
        expect(request.attributes.className).toContain('bg-blue-500');
    });

    test('getDisplayDirection detects vertical stacking for pink/blue div case', () => {
        const parent = new MockElement({});
        const pinkDiv = new MockElement({
            top: 0,
            left: 10,
            bottom: 100,
            right: 110,
            width: 100,
            height: 100,
            x: 10,
            y: 0,
        });
        const blueDiv = new MockElement({
            top: 100,
            left: 12,
            bottom: 200,
            right: 112,
            width: 100,
            height: 100,
            x: 12,
            y: 100,
        });

        parent.appendChild(pinkDiv);
        parent.appendChild(blueDiv);

        const direction = getDisplayDirection(parent as any);
        expect(direction).toBe(DisplayDirection.VERTICAL);
    });
});
