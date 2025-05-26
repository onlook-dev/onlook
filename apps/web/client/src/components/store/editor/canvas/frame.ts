import { api } from '@/trpc/client';
import { FrameType, type Frame, type RectDimension, type RectPosition, type WebFrame } from '@onlook/models';
import { makeObservable, observable } from 'mobx';

export class FrameImpl implements Frame {
    id: string;
    position: RectPosition;
    dimension: RectDimension;
    type: FrameType;

    constructor(frame: Frame) {
        this.id = frame.id;
        this.position = frame.position;
        this.dimension = frame.dimension;
        this.type = frame.type;
        makeObservable(this, {
            id: observable,
            position: observable,
            dimension: observable,
            type: observable,
        });
    }

    static fromJSON(json: Frame) {
        return new FrameImpl(json);
    }

    async createFrame(canvasId: string, sandboxUrl: string, x: number, y: number, width: number, height: number) {
        const success = await api.frame.createFrame.mutate({
            canvasId,
            url: sandboxUrl,
            x: x.toString(),
            y: y.toString(),
            width: width.toString(),
            height: height.toString(),
            type: FrameType.WEB,
        });
        if (!success) {
            console.error('Failed to create frame', canvasId, sandboxUrl, x, y, width, height);
        }
    }
}

export class WebFrameImpl extends FrameImpl implements WebFrame {
    url: string;

    constructor(frame: WebFrame) {
        super(frame);
        this.url = frame.url;

        makeObservable(this, {
            url: observable,
        });
    }

    static fromJSON(json: WebFrame) {
        return new WebFrameImpl(json);
    }
}
