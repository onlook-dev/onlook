import { useEditorEngine } from '@/components/store/editor';
import { type Frame } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { debounce } from 'lodash';
import { observer } from 'mobx-react-lite';
import { useRef, useState } from 'react';
import { GestureScreen } from './gesture';
import { ResizeHandles } from './resize-handles';
import { RightClickMenu } from './right-click';
import { TopBar } from './top-bar';
import { FrameComponent, type IFrameView } from './view';

export const FrameView = observer(({ frame }: { frame: Frame }) => {
    const editorEngine = useEditorEngine();
    const iFrameRef = useRef<IFrameView>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    // Check if sandbox is connecting for this frame's branch
    const sandbox = editorEngine.branches.getSandboxById(frame.branchId);
    const isConnecting = sandbox?.session?.isConnecting || sandbox?.isIndexing || false;

    const undebouncedReloadIframe = () => {
        setReloadKey(prev => prev + 1);
    };

    const reloadIframe = debounce(undebouncedReloadIframe, 1000, {
        leading: true,
    });

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
                <FrameComponent key={reloadKey} frame={frame} reloadIframe={reloadIframe} ref={iFrameRef} />
                <GestureScreen frame={frame} isResizing={isResizing} />

                {isConnecting && (
                    <div
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-md"
                        style={{ width: frame.dimension.width, height: frame.dimension.height }}
                    >
                        <div className="flex flex-col items-center gap-3 text-foreground" style={{ transform: `scale(${1 / editorEngine.canvas.scale})` }}>
                            <Icons.LoadingSpinner className="animate-spin h-8 w-8" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
