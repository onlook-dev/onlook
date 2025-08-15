import { penpalParent } from '../..';

export function listenForWheelZoom() {
    function handleWheel(event: WheelEvent) {
        if (!(event.ctrlKey || event.metaKey)) {
            return;
        }

        const path = event.composedPath() as HTMLElement[];

        let zoomHandledInside = false;

        for (const el of path) {
            if (el instanceof Element) {
                try {
                    const style = window.getComputedStyle(el);

                    // Heuristic #1: It's explicitly scrollable
                    const scrollable = /(auto|scroll)/.test(
                        style.overflow + style.overflowX + style.overflowY,
                    );

                    // Heuristic #2: It's explicitly interactive / transforms
                    const hasTransform = style.transform !== 'none';

                    // Heuristic #3: Prevents pinch gestures in browser defaults
                    const disablesDefaultTouch = style.touchAction === 'none';

                    // Heuristic #4: Specific tag types often used for zoomable content
                    const zoomableTags = ['CANVAS', 'SVG', 'IMG'];
                    const isZoomableTag = zoomableTags.includes(el.tagName);

                    if (scrollable || hasTransform || disablesDefaultTouch || isZoomableTag) {
                        zoomHandledInside = true;
                        break;
                    }
                } catch (err) {
                    console.warn('Could not get computed style for node:', el, err);
                }
            }
        }

        if (!zoomHandledInside) {
            event.preventDefault();
            event.stopPropagation();

            if (penpalParent) {
                penpalParent
                    .onFrameWheel({
                        deltaY: event.deltaY,
                        clientX: event.clientX,
                        clientY: event.clientY,
                        ctrlKey: event.ctrlKey,
                        metaKey: event.metaKey,
                    })
                    .catch(() => {
                        // ignore
                    });
            }
        }
    }

    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
}