import type { Frame, FrameType, RectDimension, RectPosition, WebFrame } from '@onlook/models';
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
