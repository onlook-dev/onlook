import { penpalParent } from "..";

export function setFrameId(frameId: string) {
    (window as any)._onlookFrameId = frameId;
}

export function getFrameId(): string {
    const frameId = (window as any)._onlookFrameId;
    if (!frameId) {
        console.warn('Frame id not found');
        penpalParent?.getFrameId().then((id) => {
            setFrameId(id);
        });
        return '';
    }
    return frameId;
}
