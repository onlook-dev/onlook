import { useEditorEngine } from '@/components/store/editor';
import { type Frame } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
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
    
    // Check if sandbox is connecting for this frame's branch
    const sandbox = editorEngine.branches.getSandboxById(frame.branchId);
    const isConnecting = sandbox?.session?.isConnecting || false;

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
                <FrameComponent frame={frame} ref={iFrameRef} />
                <GestureScreen frame={frame} isResizing={isResizing} />
                
                {/* Connection overlay */}
                {isConnecting && (
                    <div 
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-md"
                        style={{ width: frame.dimension.width, height: frame.dimension.height }}
                    >
                        <div className="flex flex-col items-center gap-3 text-foreground">
                            <Icons.LoadingSpinner className="animate-spin h-8 w-8" />
                            <span className="text-sm text-muted-foreground">
                                Connecting to sandbox...
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
