import type { FrameImpl, WebFrameImpl } from '@/components/store/editor/frames/frame';
import { FrameType } from '@onlook/models';
import { useRef } from 'react';
import { GestureScreen } from './gesture';
import { ResizeHandles } from './resize-handles';
import { TopBar } from './top-bar';
import { WebFrameComponent, type WebFrameView } from './web-frame';

export const FrameView = ({ frame }: { frame: FrameImpl }) => {
    const webFrameRef = useRef<WebFrameView>(null);
    return (
        <div
            className="flex flex-col fixed"
            style={{ transform: `translate(${frame.position.x}px, ${frame.position.y}px)` }}
        >
            <TopBar frame={frame as WebFrameImpl} />
            <div className="relative">
                <ResizeHandles frame={frame} />
                {frame.type === FrameType.WEB && (
                    <WebFrameComponent frame={frame as WebFrameImpl} ref={webFrameRef} />
                )}
                <GestureScreen frame={frame as WebFrameImpl} />
            </div>
        </div>
    );
};
