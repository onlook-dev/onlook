import { type Frame } from '@onlook/models';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { GestureScreen } from './gesture';
import { ResizeHandles } from './resize-handles';
import { RightClickMenu } from './right-click';
import { TopBar } from './top-bar';
import { FrameComponent } from './view';

export const FrameView = observer(({ frame }: { frame: Frame }) => {
    const [isResizing, setIsResizing] = useState(false);

    return (
        <div
            className="flex flex-col fixed"
            style={{ transform: `translate(${frame.position.x}px, ${frame.position.y}px)` }}
        >
            <RightClickMenu>
                <TopBar frame={frame} />
            </RightClickMenu>
            <div className="relative">
                <ResizeHandles frame={frame} setIsResizing={setIsResizing} />
                <FrameComponent frame={frame} />
                <GestureScreen frame={frame} isResizing={isResizing} />
            </div>
        </div>
    );
});
