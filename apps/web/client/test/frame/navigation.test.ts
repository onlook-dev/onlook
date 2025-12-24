import { FrameNavigationManager } from '../../src/components/store/editor/frames/index';

describe('FrameNavigationManager', () => {
    let navigationManager: FrameNavigationManager;
    const testFrameId = 'test-frame-1';

    beforeEach(() => {
        navigationManager = new FrameNavigationManager();
    });

    describe('addToHistory', () => {
        it('should initialize history for new frame', () => {
            navigationManager.addToHistory(testFrameId, '/page1');

            expect(navigationManager.getNavigationHistory(testFrameId)).toEqual(['/page1']);
            expect(navigationManager.getCurrentHistoryIndex(testFrameId)).toBe(0);
        });

        it('should add multiple pages to history', () => {
            navigationManager.addToHistory(testFrameId, '/page1');
            navigationManager.addToHistory(testFrameId, '/page2');
            navigationManager.addToHistory(testFrameId, '/page3');

            expect(navigationManager.getNavigationHistory(testFrameId)).toEqual([
                '/page1',
                '/page2',
                '/page3',
            ]);
            expect(navigationManager.getCurrentHistoryIndex(testFrameId)).toBe(2);
        });

        it('should not add duplicate consecutive pages', () => {
            navigationManager.addToHistory(testFrameId, '/page1');
            navigationManager.addToHistory(testFrameId, '/page1');

            expect(navigationManager.getNavigationHistory(testFrameId)).toEqual(['/page1']);
            expect(navigationManager.getCurrentHistoryIndex(testFrameId)).toBe(0);
        });

        it('should not add duplicate consecutive pages when they are different', () => {
            navigationManager.addToHistory(testFrameId, '/page1');
            navigationManager.addToHistory(testFrameId, '/page1');
            navigationManager.addToHistory(testFrameId, '/page2');
            navigationManager.addToHistory(testFrameId, '/page2');

            expect(navigationManager.getNavigationHistory(testFrameId)).toEqual(['/page1', '/page2']);
            expect(navigationManager.getCurrentHistoryIndex(testFrameId)).toBe(1);
        });

        it('should not add duplicate page when it matches top of stack', () => {
            navigationManager.addToHistory(testFrameId, '/page1');
            navigationManager.addToHistory(testFrameId, '/page1');
            navigationManager.addToHistory(testFrameId, '/page2');
            navigationManager.addToHistory(testFrameId, '/page2');
            navigationManager.addToHistory(testFrameId, '/page1');

            expect(navigationManager.getNavigationHistory(testFrameId)).toEqual([
                '/page1',
                '/page2',
                '/page1'
            ]);
            expect(navigationManager.getCurrentHistoryIndex(testFrameId)).toBe(2);
        });
    });

    describe('canGoBack', () => {
        it('should return false for empty history', () => {
            expect(navigationManager.canGoBack(testFrameId)).toBe(false);
        });

        it('should return false for single page', () => {
            navigationManager.addToHistory(testFrameId, '/page1');
            expect(navigationManager.canGoBack(testFrameId)).toBe(false);
        });

        it('should return true when multiple pages exist', () => {
            navigationManager.addToHistory(testFrameId, '/page1');
            navigationManager.addToHistory(testFrameId, '/page2');
            expect(navigationManager.canGoBack(testFrameId)).toBe(true);
        });
    });

    describe('canGoForward', () => {
        it('should return false for empty history', () => {
            expect(navigationManager.canGoForward(testFrameId)).toBe(false);
        });

        it('should return false when at end of history', () => {
            navigationManager.addToHistory(testFrameId, '/page1');
            navigationManager.addToHistory(testFrameId, '/page2');
            expect(navigationManager.canGoForward(testFrameId)).toBe(false);
        });

        it('should return true when not at end of history', () => {
            navigationManager.addToHistory(testFrameId, '/page1');
            navigationManager.addToHistory(testFrameId, '/page2');
            navigationManager.goBack(testFrameId);
            expect(navigationManager.canGoForward(testFrameId)).toBe(true);
        });
    });

    describe('goBack', () => {
        it('should return null when no history', () => {
            expect(navigationManager.goBack(testFrameId)).toBeNull();
        });

        it('should return previous page and update index', () => {
            navigationManager.addToHistory(testFrameId, '/page1');
            navigationManager.addToHistory(testFrameId, '/page2');

            const result = navigationManager.goBack(testFrameId);
            expect(result).toBe('/page1');
            expect(navigationManager.getCurrentHistoryIndex(testFrameId)).toBe(0);
        });
    });

    describe('goForward', () => {
        it('should return null when at end of history', () => {
            navigationManager.addToHistory(testFrameId, '/page1');
            expect(navigationManager.goForward(testFrameId)).toBeNull();
        });

        it('should return next page and update index', () => {
            navigationManager.addToHistory(testFrameId, '/page1');
            navigationManager.addToHistory(testFrameId, '/page2');
            navigationManager.goBack(testFrameId);

            const result = navigationManager.goForward(testFrameId);
            expect(result).toBe('/page2');
            expect(navigationManager.getCurrentHistoryIndex(testFrameId)).toBe(1);
        });
    });

    describe('clearHistory', () => {
        it('should clear history for specific frame', () => {
            navigationManager.addToHistory(testFrameId, '/page1');
            navigationManager.addToHistory(testFrameId, '/page2');

            navigationManager.clearHistory(testFrameId);

            expect(navigationManager.getNavigationHistory(testFrameId)).toEqual([]);
        });
    });

    describe('clearAllHistory', () => {
        it('should clear all frame histories', () => {
            const frameId1 = 'frame-1';
            const frameId2 = 'frame-2';

            navigationManager.addToHistory(frameId1, '/page1');
            navigationManager.addToHistory(frameId2, '/page2');

            navigationManager.clearAllHistory();

            expect(navigationManager.getNavigationHistory(frameId1)).toEqual([]);
            expect(navigationManager.getNavigationHistory(frameId2)).toEqual([]);
        });
    });

    describe('multiple frames', () => {
        const frameId1 = 'frame-1';
        const frameId2 = 'frame-2';

        it('should maintain separate history for different frames', () => {
            navigationManager.addToHistory(frameId1, '/page1');
            navigationManager.addToHistory(frameId1, '/page2');
            navigationManager.addToHistory(frameId2, '/page3');
            navigationManager.addToHistory(frameId2, '/page4');

            expect(navigationManager.getNavigationHistory(frameId1)).toEqual(['/page1', '/page2']);
            expect(navigationManager.getNavigationHistory(frameId2)).toEqual(['/page3', '/page4']);
            expect(navigationManager.getCurrentHistoryIndex(frameId1)).toBe(1);
            expect(navigationManager.getCurrentHistoryIndex(frameId2)).toBe(1);
        });

        it('should allow independent navigation for different frames', () => {
            navigationManager.addToHistory(frameId1, '/page1');
            navigationManager.addToHistory(frameId1, '/page2');
            navigationManager.addToHistory(frameId2, '/page3');
            navigationManager.addToHistory(frameId2, '/page4');

            // Navigate back in frame1
            navigationManager.goBack(frameId1);
            expect(navigationManager.getCurrentHistoryIndex(frameId1)).toBe(0);
            expect(navigationManager.getCurrentHistoryIndex(frameId2)).toBe(1);

            // Navigate back in frame2
            navigationManager.goBack(frameId2);
            expect(navigationManager.getCurrentHistoryIndex(frameId1)).toBe(0);
            expect(navigationManager.getCurrentHistoryIndex(frameId2)).toBe(0);
        });

        it('should clear history for specific frame', () => {
            navigationManager.addToHistory(frameId1, '/page1');
            navigationManager.addToHistory(frameId2, '/page2');

            navigationManager.clearHistory(frameId1);

            expect(navigationManager.getNavigationHistory(frameId1)).toEqual([]);
            expect(navigationManager.getNavigationHistory(frameId2)).toEqual(['/page2']);
        });

        it('should remove frame history when frame is disposed', () => {
            navigationManager.addToHistory(frameId1, '/page1');
            navigationManager.addToHistory(frameId2, '/page2');

            navigationManager.removeFrame(frameId1);

            expect(navigationManager.getNavigationHistory(frameId1)).toEqual([]);
            expect(navigationManager.getNavigationHistory(frameId2)).toEqual(['/page2']);
        });
    });
});
