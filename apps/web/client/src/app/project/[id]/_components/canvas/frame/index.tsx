import { useEditorEngine } from '@/components/store/editor';
import { type Frame } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { colors } from '@onlook/ui/tokens';
import { debounce } from 'lodash';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { RightClickMenu } from '../../right-click-menu';
import { GestureScreen } from './gesture';
import { ResizeHandles } from './resize-handles';
import { TopBar } from './top-bar';
import { FrameComponent, type IFrameView } from './view';

// Reload timing constants
const RELOAD_BASE_DELAY_MS = 2000;
const RELOAD_INCREMENT_MS = 1000;
const SANDBOX_TIMEOUT_MS = 30000;
const PENPAL_BASE_TIMEOUT_MS = 5000;
const PENPAL_TIMEOUT_INCREMENT_MS = 2000;
const PENPAL_MAX_TIMEOUT_MS = 30000;

export const FrameView = observer(({ frame, isInDragSelection = false }: { frame: Frame; isInDragSelection?: boolean }) => {
    const editorEngine = useEditorEngine();
    const iFrameRef = useRef<IFrameView>(null);
    const reloadCountRef = useRef(0);
    const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [isResizing, setIsResizing] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [hasTimedOut, setHasTimedOut] = useState(false);
    const [isPenpalConnected, setIsPenpalConnected] = useState(false);

    const isSelected = editorEngine.frames.isSelected(frame.id);
    const branchData = editorEngine.branches.getBranchDataById(frame.branchId);
    const isConnecting = branchData?.sandbox?.session?.isConnecting ?? false;
    const preloadScriptReady = branchData?.sandbox?.preloadScriptInjected ?? false;
    const isFrameReady = preloadScriptReady && !(isConnecting && !hasTimedOut);

    // Sandbox connection timeout (30s)
    useEffect(() => {
        if (!isConnecting) {
            setHasTimedOut(false);
            return;
        }

        const timeoutId = setTimeout(() => {
            const currentBranchData = editorEngine.branches.getBranchDataById(frame.branchId);
            const stillConnecting = currentBranchData?.sandbox?.session?.isConnecting ?? false;

            if (stillConnecting) {
                console.log(`[Frame ${frame.id}] Sandbox connection timeout after ${SANDBOX_TIMEOUT_MS}ms`);
                toast.info('Connection slow, retrying...', {
                    description: `Reconnecting to ${currentBranchData?.branch?.name}...`,
                });
                handleConnectionFailed();
            }
        }, SANDBOX_TIMEOUT_MS);

        return () => clearTimeout(timeoutId);
    }, [isConnecting, frame.branchId]);

    const immediateReload = () => {
        console.log(`[Frame ${frame.id}] Immediate reload triggered`);
        setReloadKey(prev => prev + 1);
    };

    const scheduleReload = () => {
        if (reloadTimeoutRef.current) {
            clearTimeout(reloadTimeoutRef.current);
        }

        reloadCountRef.current += 1;
        const reloadDelay = RELOAD_BASE_DELAY_MS + (RELOAD_INCREMENT_MS * (reloadCountRef.current - 1));

        console.log(
            `[Frame ${frame.id}] Scheduling iframe reload attempt ${reloadCountRef.current} in ${reloadDelay}ms`
        );

        reloadTimeoutRef.current = setTimeout(() => {
            console.log(`[Frame ${frame.id}] Reloading iframe`);
            setReloadKey(prev => prev + 1);
            reloadTimeoutRef.current = null;
        }, reloadDelay);
    };

    const handleConnectionFailed = debounce(() => {
        setIsPenpalConnected(false);
        scheduleReload();
    }, 1000, { leading: true });

    const handleConnectionSuccess = () => {
        setIsPenpalConnected(true);
    };

    // Reset reload counter on successful connection
    useEffect(() => {
        if (isPenpalConnected && reloadCountRef.current > 0) {
            console.log(`[Frame ${frame.id}] Penpal connected, resetting reload counter`);
            reloadCountRef.current = 0;
        }
    }, [isPenpalConnected, frame.id]);

    // Reset connection state on reload
    useEffect(() => {
        setIsPenpalConnected(false);
    }, [reloadKey]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (reloadTimeoutRef.current) {
                clearTimeout(reloadTimeoutRef.current);
            }
        };
    }, []);

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
                    penpalTimeoutMs={Math.min(
                        PENPAL_BASE_TIMEOUT_MS + (reloadCountRef.current * PENPAL_TIMEOUT_INCREMENT_MS),
                        PENPAL_MAX_TIMEOUT_MS
                    )}
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
