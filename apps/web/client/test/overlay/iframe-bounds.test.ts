import { clipRectToIframeBounds } from '@/components/store/editor/overlay/utils';
import type { RectDimensions } from '@onlook/models';
import { beforeEach, describe, expect, mock, test } from 'bun:test';

// Mock DOM globals
const mockGetElementById = mock((id: string) => {
    if (id === 'canvas-container') {
        return {
            id: 'canvas-container',
            style: { transform: 'scale(1) translate(0px, 0px)' },
        };
    }
    return null;
});

const mockGetComputedStyle = mock(() => ({
    transform: 'matrix(1, 0, 0, 1, 0, 0)',
}));

const mockDOMMatrix = mock((transform: string) => ({
    a: 1,    
    b: 0,
    c: 0, 
    d: 1,    
    e: 0,    
    f: 0,    
    m41: 0,  
    m42: 0,  
}));

// Setup global mocks
global.document = { getElementById: mockGetElementById } as any;
global.window = { getComputedStyle: mockGetComputedStyle } as any;
global.getComputedStyle = mockGetComputedStyle as any;
global.DOMMatrix = mockDOMMatrix as any;

describe('clipRectToIframeBounds', () => {
    let mockFrameView: any;

    beforeEach(() => {
        // Reset all mocks
        mockGetElementById.mockClear();
        mockGetComputedStyle.mockClear();
        mockDOMMatrix.mockClear();

        // Create a mock iframe frameView with realistic properties
        mockFrameView = {
            offsetWidth: 800,
            offsetHeight: 600,
            offsetLeft: 0,
            offsetTop: 0,
            offsetParent: null, // This will make getRelativeOffset return { top: 0, left: 0 }
        };

        // Setup default mock implementations
        mockGetElementById.mockImplementation((id: string) => {
            if (id === 'canvas-container') {
                return {
                    id: 'canvas-container',
                    style: { transform: 'scale(1) translate(0px, 0px)' },
                };
            }
            return null;
        });

        mockGetComputedStyle.mockImplementation(() => ({
            transform: 'matrix(1, 0, 0, 1, 0, 0)', // No scaling or translation
        }));

        mockDOMMatrix.mockImplementation(() => ({
            a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, m41: 0, m42: 0,
        }));
    });

    test('should clip rectangle extending beyond right edge', () => {
        const rect: RectDimensions = {
            left: 700,
            top: 100,
            width: 200, // 700 + 200 = 900 > 800 (iframe width)
            height: 100,
        };

        const result = clipRectToIframeBounds(rect, mockFrameView);

        expect(result.left).toBe(700);
        expect(result.top).toBe(100);
        expect(result.width).toBe(100); // Clipped: 800 - 700 = 100
        expect(result.height).toBe(100);
    });

    test('should clip rectangle extending beyond bottom edge', () => {
        const rect: RectDimensions = {
            left: 100,
            top: 550,
            width: 100,
            height: 100, // 550 + 100 = 650 > 600 (iframe height)
        };

        const result = clipRectToIframeBounds(rect, mockFrameView);

        expect(result.left).toBe(100);
        expect(result.top).toBe(550);
        expect(result.width).toBe(100);
        expect(result.height).toBe(50); // Clipped: 600 - 550 = 50
    });

    test('should clip rectangle completely outside iframe bounds', () => {
        const rect: RectDimensions = {
            left: 900, // Completely outside
            top: 100,
            width: 100,
            height: 100,
        };

        const result = clipRectToIframeBounds(rect, mockFrameView);

        expect(result.left).toBe(900);
        expect(result.top).toBe(100);
        expect(result.width).toBe(0); // Completely clipped
        expect(result.height).toBe(100);
    });

    test('should not clip rectangle within iframe bounds', () => {
        const rect: RectDimensions = {
            left: 200,
            top: 200,
            width: 300,
            height: 200,
        };

        const result = clipRectToIframeBounds(rect, mockFrameView);

        expect(result).toEqual(rect); // No clipping needed
    });

    test('should handle canvas container not found', () => {
        mockGetElementById.mockImplementation(() => null);

        const rect: RectDimensions = {
            left: 100,
            top: 100,
            width: 100,
            height: 100,
        };

        const result = clipRectToIframeBounds(rect, mockFrameView);

        expect(result).toEqual(rect); // Returns original rect when canvas not found
    });

    test('should handle scaled canvas (scale 2x)', () => {
        // Mock a 2x scaled canvas
        mockGetComputedStyle.mockImplementation(() => ({
            transform: 'matrix(2, 0, 0, 2, 0, 0)', // scale(2)
        }));

        mockDOMMatrix.mockImplementation(() => ({
            a: 2, b: 0, c: 0, d: 2, e: 0, f: 0, m41: 0, m42: 0,
        }));

        const rect: RectDimensions = {
            left: 700,
            top: 100,
            width: 200,
            height: 100,
        };

        const result = clipRectToIframeBounds(rect, mockFrameView);

        expect(result.width).toBe(200);
    });

    test('should handle translated canvas', () => {
        // Mock a translated canvas
        mockGetComputedStyle.mockImplementation(() => ({
            transform: 'matrix(1, 0, 0, 1, 100, 50)',
        }));

        mockDOMMatrix.mockImplementation(() => ({
            a: 1, b: 0, c: 0, d: 1, e: 100, f: 50, m41: 100, m42: 50,
        }));

        const rect: RectDimensions = {
            left: 850,
            top: 100,
            width: 200,
            height: 100,
        };

        const result = clipRectToIframeBounds(rect, mockFrameView);

        expect(result.left).toBe(850);
        expect(result.width).toBe(150);
        expect(result.width).toBeLessThan(200);
    });

    test('should handle iframe with offset position', () => {
        // Mock an iframe that has an offset position
        mockFrameView = {
            offsetWidth: 800,
            offsetHeight: 600,
            offsetLeft: 100,
            offsetTop: 50,
            offsetParent: {
                offsetLeft: 0,
                offsetTop: 0,
                offsetParent: null,
            },
        };

        const rect: RectDimensions = {
            left: 850,
            top: 100,
            width: 100,
            height: 100,
        };

        const result = clipRectToIframeBounds(rect, mockFrameView);

        expect(result.width).toBeLessThanOrEqual(100);
    });
}); 