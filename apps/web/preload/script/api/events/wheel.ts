import { penpalParent } from '../..';

export function listenForWheelZoom() {
    function handleWheel(event: WheelEvent) {
        if (!(event.ctrlKey || event.metaKey)) {
            return;
        }

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

    window.addEventListener('wheel', handleWheel, { passive: false });
}


