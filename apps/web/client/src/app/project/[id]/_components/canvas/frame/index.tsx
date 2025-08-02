import { FrameType, type Frame, type WebFrame } from '@onlook/models';
import { observer } from 'mobx-react-lite';
import { useRef, useState } from 'react';
import { GestureScreen } from './gesture';
import { ResizeHandles } from './resize-handles';
import { RightClickMenu } from './right-click';
import { TopBar } from './top-bar';
import { WebFrameComponent, type WebFrameView } from './web-frame';

export const FrameView = observer(({ frame }: { frame: Frame }) => {
    const webFrameRef = useRef<WebFrameView>(null);
    const [isResizing, setIsResizing] = useState(false);

    return (
        <div
            className="flex flex-col fixed"
            style={{ transform: `translate(${frame.position.x}px, ${frame.position.y}px)` }}
        >
            <RightClickMenu>
                <TopBar frame={frame as WebFrame} />
            </RightClickMenu>
            <div className="relative">
                <ResizeHandles frame={frame} setIsResizing={setIsResizing} />
                {frame.type === FrameType.WEB && (
                    <WebFrameComponent frame={frame as WebFrame} ref={webFrameRef} />
                )}
                <GestureScreen frame={frame as WebFrame} isResizing={isResizing} />
            </div>
        </div>
    );
});
