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

    update(newFrame: Partial<Frame>) {
        this.position = { ...this.position, ...newFrame.position };
        this.dimension = { ...this.dimension, ...newFrame.dimension };
        this.type = newFrame.type ?? this.type;
    }

    static fromJSON(frame: Frame): FrameImpl {
        switch (frame.type) {
            case FrameType.WEB:
                return WebFrameImpl.fromJSON(frame as WebFrame);
            default:
                return new FrameImpl(frame);
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
