import type { Frame, FrameType, RectDimension, RectPosition, WebFrame, WindowMetadata } from '@onlook/models';
import { makeObservable, observable } from 'mobx';

export class FrameImpl implements Frame {
    id: string;
    position: RectPosition;
    dimension: RectDimension;
    type: FrameType;
    windowMetadata: WindowMetadata;

    constructor(frame: Frame) {
        this.id = frame.id;
        this.position = frame.position;
        this.dimension = frame.dimension;
        this.type = frame.type;
        this.windowMetadata = frame.windowMetadata ?? {};
        makeObservable(this, {
            id: observable,
            position: observable,
            dimension: observable,
            type: observable,
            windowMetadata: observable
        });
    }

    static fromJSON(json: Frame) {
        return new FrameImpl(json);
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
