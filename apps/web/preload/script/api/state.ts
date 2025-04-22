import { remote } from "..";

export function setFrameId(frameId: string) {
    (window as any)._onlookFrameId = frameId;
}

export async function getFrameId(): Promise<string> {
    const frameId = (window as any)._onlookFrameId;
    if (!frameId) {
        console.warn('Frame id not found');
        const frameId = await remote?.getFrameId() ?? '';
        setFrameId(frameId);
        return frameId;
    }
    return frameId;
}
