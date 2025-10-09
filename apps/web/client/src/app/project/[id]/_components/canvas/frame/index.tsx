import { useEditorEngine } from '@/components/store/editor';
import { type Frame } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { colors } from '@onlook/ui/tokens';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
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
    const sandbox = branchData?.sandbox;
    const connectionState = sandbox?.connectionState ?? 'idle';
    const preloadScriptReady = sandbox?.preloadScriptInjected ?? false;
    const sessionConnecting = sandbox?.session?.isConnecting ?? false;

    // Lazily trigger sandbox connection when needed
    useEffect(() => {
        if (sandbox && connectionState === 'idle') {
            sandbox.ensureConnected().catch((err) => {
                console.error('[Frame] Failed to connect sandbox:', err);
            });
        }
    }, [sandbox, connectionState]);

    const isFrameReady =
        connectionState === 'connected' &&
        preloadScriptReady &&
        !(sessionConnecting && !hasTimedOut);

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

                {!isFrameReady && connectionState !== 'error' && (
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

                {connectionState === 'error' && (
                    <div
                        className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50 rounded-md"
                        style={{
                            width: frame.dimension.width,
                            height: frame.dimension.height,
                        }}
                    >
                        <div
                            className="flex flex-col items-center gap-4 text-foreground p-4 max-w-md"
                            style={{ transform: `scale(${1 / editorEngine.canvas.scale})` }}
                        >
                            <div className="text-center">
                                <p className="font-semibold text-red-500 mb-2">Connection Failed</p>
                                <p className="text-sm text-muted-foreground">
                                    {sandbox?.connectionError?.message ?? 'Unknown error'}
                                </p>
                                {sandbox && sandbox.connectionRetryCount > 0 && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Retry attempts: {sandbox.connectionRetryCount}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    if (sandbox) {
                                        sandbox.connect().catch((err) => {
                                            console.error('[Frame] Retry failed:', err);
                                        });
                                    }
                                }}
                                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-md text-sm font-medium transition-colors"
                            >
                                Retry Connection
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
