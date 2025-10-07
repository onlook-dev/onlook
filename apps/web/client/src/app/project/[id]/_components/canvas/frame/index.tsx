import { useEditorEngine } from '@/components/store/editor';
import { type Frame } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { colors } from '@onlook/ui/tokens';
import { observer } from 'mobx-react-lite';
import { useRef, useState } from 'react';
import { RightClickMenu } from '../../right-click-menu';
import { GestureScreen } from './gesture';
import { ResizeHandles } from './resize-handles';
import { TopBar } from './top-bar';
import { useFrameReload } from './use-frame-reload';
import { useSandboxTimeout } from './use-sandbox-timeout';
import { FrameComponent, type IFrameView } from './view';

export const FrameView = observer(({ frame, isInDragSelection = false }: { frame: Frame; isInDragSelection?: boolean }) => {
    const editorEngine = useEditorEngine();
    const iFrameRef = useRef<IFrameView>(null);
    const [isResizing, setIsResizing] = useState(false);

    const {
        reloadKey,
        immediateReload,
        handleConnectionFailed,
        handleConnectionSuccess,
        getPenpalTimeout,
    } = useFrameReload();

    const { hasTimedOut, isConnecting } = useSandboxTimeout(frame, handleConnectionFailed);

    const isSelected = editorEngine.frames.isSelected(frame.id);
    const branchData = editorEngine.branches.getBranchDataById(frame.branchId);
    const preloadScriptReady = branchData?.sandbox?.preloadScriptInjected ?? false;
    const isFrameReady = preloadScriptReady && !(isConnecting && !hasTimedOut);

    return (
        <div
            className="flex flex-col fixed"
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
                    reloadIframe={immediateReload}
                    onConnectionFailed={handleConnectionFailed}
                    onConnectionSuccess={handleConnectionSuccess}
                    penpalTimeoutMs={getPenpalTimeout()}
                    isInDragSelection={isInDragSelection}
                    ref={iFrameRef}
                />
                <GestureScreen frame={frame} isResizing={isResizing} />

                {!isFrameReady && (
                    <div
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-md"
                        style={{
                            width: frame.dimension.width,
                            height: frame.dimension.height,
                        }}
                    >
                        <div
                            className="flex items-center gap-3 text-foreground"
                            style={{ transform: `scale(${1 / editorEngine.canvas.scale})` }}
                        >
                            <Icons.LoadingSpinner className="animate-spin h-8 w-8" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
