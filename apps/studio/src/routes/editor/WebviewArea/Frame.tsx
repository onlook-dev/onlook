import { useEditorEngine, useProjectsManager } from '@/components/Context';
import type { WebviewMessageBridge } from '@/lib/editor/messageBridge';
import type { SizePreset } from '@/lib/sizePresets';
import { getRunProjectCommand } from '@/lib/utils';
import { Links } from '@onlook/models/constants';
import type { FrameSettings } from '@onlook/models/projects';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/use-toast';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import BrowserControls from './BrowserControl';
import GestureScreen from './GestureScreen';
import ResizeHandles from './ResizeHandles';
import { isOnlookInDoc } from '/common/helpers';

const Frame = observer(
    ({
        messageBridge,
        settings,
    }: {
        messageBridge: WebviewMessageBridge;
        settings: FrameSettings;
    }) => {
        const RETRY_TIMEOUT = 3000;
        const DOM_FAILED_DELAY = 3000;
        const editorEngine = useEditorEngine();
        const projectManager = useProjectsManager().project;
        const webviewRef = useRef<Electron.WebviewTag | null>(null);

        const [selected, setSelected] = useState<boolean>(false);
        const [focused, setFocused] = useState<boolean>(false);
        const [hovered, setHovered] = useState<boolean>(false);
        const [darkmode, setDarkmode] = useState<boolean>(false);
        const [domReady, setDomReady] = useState(false);
        const [domFailed, setDomFailed] = useState(false);
        const [shouldShowDomFailed, setShouldShowDomFailed] = useState(false);
        const [onlookEnabled, setOnlookEnabled] = useState(false);
        const [selectedPreset, setSelectedPreset] = useState<SizePreset | null>(null);
        const [lockedPreset, setLockedPreset] = useState<SizePreset | null>(null);

        const [webviewSize, setWebviewSize] = useState(settings.dimension);
        const [webviewSrc, setWebviewSrc] = useState<string>(settings.url);
        const [webviewPosition, setWebviewPosition] = useState(settings.position);
        const [isCopied, setIsCopied] = useState<boolean>(false);
        const [isResizing, setIsResizing] = useState<boolean>(false);

        const runProjectCommand = getRunProjectCommand(projectManager?.folderPath || '');
        const iconVariants = {
            initial: { scale: 0.5, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            exit: { scale: 0.5, opacity: 0 },
        };

        useEffect(setupFrame, [webviewRef]);
        useEffect(
            () => setSelected(editorEngine.webviews.isSelected(settings.id)),
            [editorEngine.webviews.webviews],
        );

        useEffect(() => {
            editorEngine.canvas.saveFrame(settings.id, {
                url: webviewSrc,
                dimension: webviewSize,
                position: webviewPosition,
            });
        }, [webviewSize, webviewSrc, webviewPosition]);

        useEffect(() => {
            if (!domFailed) {
                setShouldShowDomFailed(false);
            }
        }, [domFailed]);

        useEffect(() => {
            let timer: Timer;

            if (domFailed) {
                timer = setTimeout(() => {
                    setShouldShowDomFailed(true);
                }, DOM_FAILED_DELAY);
            } else {
                setShouldShowDomFailed(false);
            }

            return () => {
                if (timer) {
                    clearTimeout(timer);
                }
            };
        }, [domFailed]);

        function setupFrame() {
            const webview = webviewRef.current as Electron.WebviewTag | null;
            if (!webview) {
                return;
            }
            editorEngine.webviews.register(webview);
            messageBridge.register(webview, settings.id);
            setBrowserEventListeners(webview);

            return () => {
                editorEngine.webviews.deregister(webview);
                messageBridge.deregister(webview);
                webview.removeEventListener('did-navigate', handleUrlChange);
            };
        }

        function setBrowserEventListeners(webview: Electron.WebviewTag) {
            webview.addEventListener('did-navigate', handleUrlChange);
            webview.addEventListener('did-navigate-in-page', handleUrlChange);
            webview.addEventListener('dom-ready', handleDomReady);
            webview.addEventListener('did-fail-load', handleDomFailed);
            webview.addEventListener('focus', handleWebviewFocus);
            webview.addEventListener('blur', handleWebviewBlur);
        }

        function handleUrlChange(e: any) {
            setWebviewSrc(e.url);
        }

        async function handleDomReady() {
            const webview = webviewRef.current as Electron.WebviewTag | null;
            if (!webview) {
                return;
            }
            await webview.executeJavaScript(`window.api?.setWebviewId('${webview.id}')`);

            setDomReady(true);
            webview.setZoomLevel(0);
            const body = await editorEngine.ast.getBodyFromWebview(webview);
            setDomFailed(body.children.length === 0);
            checkForOnlookEnabled(body);
            setTimeout(() => getDarkMode(webview), 100);

            webview.executeJavaScript(`window.api?.processDom()`);
        }

        async function getDarkMode(webview: Electron.WebviewTag) {
            const darkmode = (await webview.executeJavaScript(`window.api?.getTheme()`)) || 'light';
            setDarkmode(darkmode === 'dark');
        }

        function checkForOnlookEnabled(body: Element) {
            const doc = body.ownerDocument;
            setOnlookEnabled(isOnlookInDoc(doc));
        }

        function handleDomFailed() {
            setDomFailed(true);
            setTimeout(() => {
                const webview = webviewRef.current as Electron.WebviewTag | null;
                if (webview) {
                    webview.reload();
                }
            }, RETRY_TIMEOUT);
        }

        function handleWebviewFocus() {
            setFocused(true);
        }

        function handleWebviewBlur() {
            setFocused(false);
        }

        function startMove(e: MouseEvent<HTMLDivElement, globalThis.MouseEvent>) {
            e.preventDefault();
            e.stopPropagation();

            editorEngine.overlay.clear();

            const startX = e.clientX;
            const startY = e.clientY;

            const move: any = (e: MouseEvent) => {
                const scale = editorEngine.canvas.scale;
                const deltaX = (e.clientX - startX) / scale;
                const deltaY = (e.clientY - startY) / scale;

                setWebviewPosition({
                    x: webviewPosition.x + deltaX,
                    y: webviewPosition.y + deltaY,
                });
            };

            const stopMove = (e: any) => {
                e.preventDefault();
                e.stopPropagation();

                window.removeEventListener('mousemove', move);
                window.removeEventListener('mouseup', stopMove);
            };

            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', stopMove);
        }

        function copyCommand() {
            navigator.clipboard.writeText(runProjectCommand);
            setIsCopied(true);
            toast({ title: 'Copied to clipboard' });
            setTimeout(() => setIsCopied(false), 2000);
        }

        return (
            <div
                className="flex flex-col space-y-1.5"
                style={{ transform: `translate(${webviewPosition.x}px, ${webviewPosition.y}px)` }}
            >
                <div
                    onMouseDown={startMove}
                    className={cn(
                        'cursor-move flex w-full opacity-10 hover:opacity-80',
                        hovered && 'opacity-20',
                    )}
                >
                    <Icons.DragHandleDots className="text-foreground-primary rotate-90 w-8 h-8" />
                </div>
                <BrowserControls
                    webviewRef={domReady ? webviewRef : null}
                    webviewSrc={webviewSrc}
                    setWebviewSrc={setWebviewSrc}
                    setWebviewSize={setWebviewSize}
                    selected={selected}
                    hovered={hovered}
                    setHovered={setHovered}
                    darkmode={darkmode}
                    setDarkmode={setDarkmode}
                    onlookEnabled={onlookEnabled}
                    selectedPreset={selectedPreset}
                    setSelectedPreset={setSelectedPreset}
                    lockedPreset={lockedPreset}
                    setLockedPreset={setLockedPreset}
                    settings={settings}
                />
                <div className="relative">
                    <ResizeHandles
                        webviewRef={webviewRef}
                        webviewSize={webviewSize}
                        setWebviewSize={setWebviewSize}
                        selectedPreset={selectedPreset}
                        setSelectedPreset={setSelectedPreset}
                        lockedPreset={lockedPreset}
                        setLockedPreset={setLockedPreset}
                        setIsResizing={setIsResizing}
                    />
                    <webview
                        id={settings.id}
                        ref={webviewRef}
                        className={cn(
                            'w-[96rem] h-[60rem] backdrop-blur-sm transition outline outline-4',
                            shouldShowDomFailed ? 'bg-transparent' : 'bg-white',
                            focused
                                ? 'outline-blue-400'
                                : selected
                                  ? 'outline-teal-400'
                                  : 'outline-transparent',
                        )}
                        src={settings.url}
                        preload={`file://${window.env.WEBVIEW_PRELOAD_PATH}`}
                        allowpopups={'true' as any}
                        style={{
                            width: webviewSize.width,
                            height: webviewSize.height,
                        }}
                    ></webview>
                    <GestureScreen
                        isResizing={isResizing}
                        webviewRef={webviewRef}
                        setHovered={setHovered}
                    />
                    {domFailed && shouldShowDomFailed && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-gray-800/40 via-gray-500/40 to-gray-400/40 border-gray-500 border-[0.5px] space-y-6 rounded-xl">
                            <p className="text-active text-title1 text-center">
                                {'Press '}
                                <span className="text-teal-600 dark:text-teal-300">Play</span>
                                {' to start designing your App'}
                            </p>
                            <p className="text-foreground-onlook text-title3 text-center max-w-80">
                                {'In Onlook, you design your App while it is running'}
                            </p>
                            <Button
                                variant={'link'}
                                size={'lg'}
                                className="text-title2"
                                onClick={() => {
                                    window.open(Links.USAGE_DOCS, '_blank');
                                }}
                            >
                                Read the get started guide
                                <Icons.ExternalLink className="ml-2 w-6 h-6" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    },
);

export default Frame;
