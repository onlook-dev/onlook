import { useEditorEngine } from '@/components/store/editor';
import { PreloadScriptState } from '@/components/store/editor/sandbox';
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

const LOADING_MESSAGES = [
    'Starting up your project...',
    'This may take a minute or two...',
    'Initializing development environment...',
    'Tip: Use SHIFT+Click to add multiple elements on the canvas to your prompt',
    'If you have a large project, it may take a while...',
    'Tip: Click the "Branch" icon to create a new version of your project on the canvas',
    'Preparing the visual editor...',
    'Tip: Double-click on an element to open it up in the code editor',
    'Hang in there... seems like a large project...',
    'Thanks for your patience... standby...',
    'Loading your components and assets...',
    'Tip: Select multiple windows by clicking and dragging on the canvas',
    'Getting everything ready for you...',
    'Give it another minute...',
    'Hmmmmm...',
    'You may want to try refreshing your tab...',
    'Still not loading? Try refreshing your browser...',
    'If you\'re seeing this message, it\'s probably because your project is large...',
    'Onlook is still working on it...',
    'If you\'re seeing this message, it\'s probably because your project is large...',
    'If it\'s still not loading, contact support with the ? button in the bottom left corner',
    'If it\'s still not loading, contact support with the ? button in the bottom left corner',
    'If it\'s still not loading, contact support with the ? button in the bottom left corner',
];

export const FrameView = observer(({ frame, isInDragSelection = false }: { frame: Frame; isInDragSelection?: boolean }) => {
    const editorEngine = useEditorEngine();
    const iFrameRef = useRef<IFrameView>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [messageIndex, setMessageIndex] = useState(0);
    const MESSAGE_INTERVAL = 12000;

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
    const preloadScriptReady = branchData?.sandbox?.preloadScriptState === PreloadScriptState.INJECTED;
    const isFrameReady = preloadScriptReady && !(isConnecting && !hasTimedOut);

    useEffect(() => {
        if (isFrameReady) {
            setMessageIndex(0);
            return;
        }

        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, MESSAGE_INTERVAL);

        return () => clearInterval(interval);
    }, [isFrameReady]);

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
                            className="flex flex-col items-center gap-3 text-foreground"
                            style={{
                                transform: `scale(${1 / editorEngine.canvas.scale})`,
                                width: `${frame.dimension.width * editorEngine.canvas.scale}px`,
                                maxWidth: `${frame.dimension.width * editorEngine.canvas.scale}px`,
                                padding: '0 16px'
                            }}
                        >
                            <Icons.LoadingSpinner className="animate-spin h-8 w-8" />
                            <p className="text-sm text-center bg-gradient-to-l from-white/20 via-white/90 to-white/20 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer filter drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                                {LOADING_MESSAGES[messageIndex]}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
