import { useEditorEngine } from '@/components/store/editor';
import { type Frame } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { debounce } from 'lodash';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
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
    const [hasTimedOut, setHasTimedOut] = useState(false);
    const isSelected = editorEngine.frames.isSelected(frame.id);

    // Check if sandbox is connecting for this frame's branch
    const branchData = editorEngine.branches.getBranchDataById(frame.branchId);
    const isConnecting = branchData?.sandbox?.session?.isConnecting || branchData?.sandbox?.isIndexing || false;

    // Timeout for connection attempts
    useEffect(() => {
        if (!isConnecting) {
            setHasTimedOut(false);
            return;
        }

        const timeoutId = setTimeout(() => {
            const currentBranchData = editorEngine.branches.getBranchDataById(frame.branchId);
            const stillConnecting = currentBranchData?.sandbox?.session?.isConnecting || currentBranchData?.sandbox?.isIndexing || false;

            if (stillConnecting) {
                setHasTimedOut(true);
                toast.error('Connection timeout', {
                    description: `Failed to connect to the branch ${currentBranchData?.branch?.name}. Please try reloading.`,
                });
            }
        }, 30000);

        return () => clearTimeout(timeoutId);
    }, [isConnecting, frame.branchId]);

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
            <div className="relative" style={{
                outline: isSelected ? '2px solid rgb(94, 234, 212)' : 'none',
                borderRadius: '4px',
            }}>
                <ResizeHandles frame={frame} setIsResizing={setIsResizing} />
                <FrameComponent key={reloadKey} frame={frame} reloadIframe={reloadIframe} ref={iFrameRef} />
                <GestureScreen frame={frame} isResizing={isResizing} />

                {isConnecting && !hasTimedOut && (
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
