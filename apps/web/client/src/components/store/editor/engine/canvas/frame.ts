import type { Frame, FrameType, RectDimension, RectPosition, WebFrame } from "@onlook/models";
import { makeObservable, observable } from "mobx";

export class FrameImpl implements Frame {
    id: string;
    position: RectPosition;
    dimension: RectDimension;
    type: FrameType;

    constructor({ id, position, dimension, type }: Frame) {
        this.id = id;
        this.position = position;
        this.dimension = dimension;
        this.type = type;

        makeObservable(this, {
            id: observable,
            position: observable,
            dimension: observable,
            type: observable
        });
    }

    static fromJSON(json: Frame) {
        return new FrameImpl(json);
    }
}

export class WebFrameImpl extends FrameImpl implements WebFrame {
    url: string;

    constructor({ id, position, dimension, type, url }: WebFrame) {
        super({ id, position, dimension, type });
        this.url = url;

        makeObservable(this, {
            url: observable
        });
    }

    static fromJSON(json: WebFrame) {
        return new WebFrameImpl(json);
    }
}