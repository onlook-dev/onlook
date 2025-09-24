import { useEffect, useRef, useState } from 'react';
import { debounce } from 'lodash';
import { observer } from 'mobx-react-lite';

import type { Frame } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { colors } from '@onlook/ui/tokens';

import type { IFrameView } from './view';
import { useEditorEngine } from '@/components/store/editor';
import { GestureScreen } from './gesture';
import { ResizeHandles } from './resize-handles';
import { RightClickMenu } from './right-click';
import { TopBar } from './top-bar';
import { FrameComponent } from './view';

export const FrameView = observer(
    ({ frame, isInDragSelection = false }: { frame: Frame; isInDragSelection?: boolean }) => {
        const editorEngine = useEditorEngine();
        const iFrameRef = useRef<IFrameView>(null);
        const [isResizing, setIsResizing] = useState(false);
        const [reloadKey, setReloadKey] = useState(0);
        const [hasTimedOut, setHasTimedOut] = useState(false);
        const isSelected = editorEngine.frames.isSelected(frame.id);

        // Check if sandbox is connecting for this frame's branch
        const branchData = editorEngine.branches.getBranchDataById(frame.branchId);
        const isConnecting =
            branchData?.sandbox?.session?.isConnecting || branchData?.sandbox?.isIndexing || false;

        // Timeout for connection attempts
        useEffect(() => {
            if (!isConnecting) {
                setHasTimedOut(false);
                return;
            }

            const timeoutId = setTimeout(() => {
                const currentBranchData = editorEngine.branches.getBranchDataById(frame.branchId);
                const stillConnecting =
                    currentBranchData?.sandbox?.session?.isConnecting ||
                    currentBranchData?.sandbox?.isIndexing ||
                    false;

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
            setReloadKey((prev) => prev + 1);
        };

        const reloadIframe = debounce(undebouncedReloadIframe, 1000, {
            leading: true,
        });

        return (
            <div
                className="fixed flex flex-col"
                style={{ transform: `translate(${frame.position.x}px, ${frame.position.y}px)` }}
            >
                <RightClickMenu>
                    <TopBar frame={frame} isInDragSelection={isInDragSelection} />
                </RightClickMenu>
                <div
                    className="relative"
                    style={{
                        outline: isSelected
                            ? `2px solid ${colors.teal[400]}`
                            : isInDragSelection
                              ? `2px solid ${colors.teal[500]}`
                              : 'none',
                        borderRadius: '4px',
                    }}
                >
                    <ResizeHandles frame={frame} setIsResizing={setIsResizing} />
                    <FrameComponent
                        key={reloadKey}
                        frame={frame}
                        reloadIframe={reloadIframe}
                        isInDragSelection={isInDragSelection}
                        ref={iFrameRef}
                    />
                    <GestureScreen frame={frame} isResizing={isResizing} />

                    {isConnecting && !hasTimedOut && (
                        <div
                            className="bg-background/80 absolute inset-0 z-50 flex items-center justify-center rounded-md backdrop-blur-sm"
                            style={{ width: frame.dimension.width, height: frame.dimension.height }}
                        >
                            <div
                                className="text-foreground flex flex-col items-center gap-3"
                                style={{ transform: `scale(${1 / editorEngine.canvas.scale})` }}
                            >
                                <Icons.LoadingSpinner className="h-8 w-8 animate-spin" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    },
);
