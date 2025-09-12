import { penpalParent } from "..";

declare global {
    interface Window {
        _onlookFrameId: string;
    }
}

export function setFrameId(frameId: string) {
    (window)._onlookFrameId = frameId;
}

export function getFrameId(): string {
    const frameId = (window)._onlookFrameId;
    if (!frameId) {
        console.warn('Frame id not found');
        penpalParent?.getFrameId().then((id) => {
            setFrameId(id);
        });
        return '';
    }
    return frameId;
}
