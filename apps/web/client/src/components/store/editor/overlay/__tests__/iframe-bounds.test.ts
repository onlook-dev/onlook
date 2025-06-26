import { clipRectToIframeBounds } from '../utils';
import type { RectDimensions } from '@onlook/models';

// Mock DOM elements
const mockCanvasContainer = {
    id: 'canvas-container',
    style: {
        transform: 'scale(1) translate(0px, 0px)',
    },
};

const mockFrameView = {
    offsetWidth: 800,
    offsetHeight: 600,
    offsetLeft: 100,
    offsetTop: 50,
} as any;

// Mock DOM methods
Object.defineProperty(global, 'document', {
    value: {
        getElementById: jest.fn((id) => {
            if (id === 'canvas-container') {
                return mockCanvasContainer;
            }
            return null;
        }),
    },
});

Object.defineProperty(global, 'window', {
    value: {
        getComputedStyle: jest.fn(() => ({
            transform: 'matrix(1, 0, 0, 1, 0, 0)',
        })),
    },
});

Object.defineProperty(global, 'DOMMatrix', {
    value: jest.fn().mockImplementation((transform) => ({
        a: 1, // scale X
        b: 0,
        c: 0,
        d: 1, // scale Y
        e: 0, // translate X
        f: 0, // translate Y
        m41: 0, // translateX
        m42: 0, // translateY
    })),
});

describe('Iframe Bounds Clipping', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('clips rectangle that extends beyond iframe right edge', () => {
        const rect: RectDimensions = {
            left: 700,
            top: 100,
            width: 200, // extends beyond iframe width of 800
            height: 100,
        };

        const clippedRect = clipRectToIframeBounds(rect, mockFrameView);

        expect(clippedRect.width).toBe(100); // should be clipped to stay within iframe
        expect(clippedRect.left).toBe(700);
        expect(clippedRect.height).toBe(100); // height unchanged
    });

    test('clips rectangle that extends beyond iframe bottom edge', () => {
        const rect: RectDimensions = {
            left: 100,
            top: 550,
            width: 100,
            height: 100, // extends beyond iframe height of 600
        };

        const clippedRect = clipRectToIframeBounds(rect, mockFrameView);

        expect(clippedRect.height).toBe(50); // should be clipped to stay within iframe
        expect(clippedRect.top).toBe(550);
        expect(clippedRect.width).toBe(100); // width unchanged
    });

    test('clips rectangle that is completely outside iframe bounds', () => {
        const rect: RectDimensions = {
            left: 900, // completely outside iframe width
            top: 100,
            width: 100,
            height: 100,
        };

        const clippedRect = clipRectToIframeBounds(rect, mockFrameView);

        expect(clippedRect.width).toBe(0); // should be clipped to zero
        expect(clippedRect.height).toBe(100);
    });

    test('does not clip rectangle that is completely within iframe bounds', () => {
        const rect: RectDimensions = {
            left: 200,
            top: 200,
            width: 300,
            height: 200,
        };

        const clippedRect = clipRectToIframeBounds(rect, mockFrameView);

        expect(clippedRect).toEqual(rect); // should remain unchanged
    });

    test('clips rectangle that starts before iframe left edge', () => {
        const rect: RectDimensions = {
            left: 50, // starts before iframe left edge at 100
            top: 100,
            width: 100,
            height: 100,
        };

        const clippedRect = clipRectToIframeBounds(rect, mockFrameView);

        expect(clippedRect.left).toBe(100); // should be moved to iframe left edge
        expect(clippedRect.width).toBe(50); // width should be reduced accordingly
    });
}); 