import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { WebviewState } from '@/lib/editor/engine/webview';
import type { WebviewMessageBridge } from '@/lib/editor/messageBridge';
import { EditorMode } from '@/lib/models';
import type { SizePreset } from '@/lib/sizePresets';
import { DefaultSettings } from '@onlook/models/constants';
import type { FrameSettings } from '@onlook/models/projects';
import { RunState } from '@onlook/models/run';
import { Button } from '@onlook/ui/button';
import { ShineBorder } from '@onlook/ui/shine-border';
import { cn } from '@onlook/ui/utils';
import debounce from 'lodash/debounce';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import BrowserControls from './BrowserControl';
import GestureScreen from './GestureScreen';
import ResizeHandles from './ResizeHandles';

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
        const projectsManager = useProjectsManager();
        const webviewRef = useRef<Electron.WebviewTag | null>(null);
        let domState = editorEngine.webviews.getState(settings.id);
        const [selected, setSelected] = useState<boolean>(
            editorEngine.webviews.isSelected(settings.id),
        );
        const [hovered, setHovered] = useState<boolean>(false);
        const [darkmode, setDarkmode] = useState<boolean>(false);
        const [domReady, setDomReady] = useState(false);
        const [domFailed, setDomFailed] = useState(false);
        const [shouldShowDomFailed, setShouldShowDomFailed] = useState(false);
        const [selectedPreset, setSelectedPreset] = useState<SizePreset | null>(null);
        const [lockedPreset, setLockedPreset] = useState<SizePreset | null>(null);

        const [webviewSize, setWebviewSize] = useState(settings.dimension);
        const [webviewSrc, setWebviewSrc] = useState<string>(settings.url);
        const [webviewPosition, setWebviewPosition] = useState(settings.position);
        const [isResizing, setIsResizing] = useState<boolean>(false);
        const [aspectRatioLocked, setAspectRatioLocked] = useState(
            settings.aspectRatioLocked || DefaultSettings.ASPECT_RATIO_LOCKED,
        );

        const clampedDimensions = useMemo(
            () => ({
                width: Math.max(webviewSize.width, parseInt(DefaultSettings.MIN_DIMENSIONS.width)),
                height: Math.max(
                    webviewSize.height,
                    parseInt(DefaultSettings.MIN_DIMENSIONS.height),
                ),
            }),
            [webviewSize],
        );

        const debouncedSaveFrame = useCallback(
            debounce((id: string, frameData: Partial<FrameSettings>) => {
                editorEngine.canvas.saveFrame(id, frameData);
            }, 100),
            [editorEngine.canvas],
        );

        const handleUrlChange = useCallback((e: any) => {
            setWebviewSrc(e.url);
        }, []);

        const handleDomReady = useCallback(async () => {
            const webview = webviewRef.current;
            if (!webview) {
                return;
            }

            await webview.executeJavaScript(`window.api?.setWebviewId('${webview.id}')`);
            setDomReady(true);
            webview.setZoomLevel(0);

            const body = await editorEngine.ast.getBodyFromWebview(webview);

            setDomFailed(body.children.length === 0);

            const state = editorEngine.webviews.computeState(body);
            editorEngine.webviews.setState(webview, state);

            setTimeout(() => getDarkMode(webview), 100);
            webview.executeJavaScript(`window.api?.processDom()`);
        }, [editorEngine.ast, editorEngine.webviews]);

        useEffect(() => {
            const observer = (newSettings: FrameSettings) => {
                const newDimensions = {
                    width: newSettings.dimension.width,
                    height: newSettings.dimension.height,
                };
                if (newSettings.aspectRatioLocked !== aspectRatioLocked) {
                    setAspectRatioLocked(
                        newSettings.aspectRatioLocked || DefaultSettings.ASPECT_RATIO_LOCKED,
                    );
                }
                if (
                    newSettings.dimension.width !== webviewSize.width ||
                    newSettings.dimension.height !== webviewSize.height
                ) {
                    setWebviewSize(newDimensions);
                }
            };

            editorEngine.canvas.observeSettings(settings.id, observer);

            return editorEngine.canvas.unobserveSettings(settings.id, observer);
        }, []);

        useEffect(setupFrame, [webviewRef]);
        useEffect(
            () => setSelected(editorEngine.webviews.isSelected(settings.id)),
            [editorEngine.webviews.webviews],
        );

        useEffect(() => {
            if (projectsManager.runner?.state === RunState.STOPPING) {
                const refresh = () => {
                    const webview = webviewRef.current as Electron.WebviewTag | null;
                    if (webview) {
                        try {
                            webview.reload();
                        } catch (error) {
                            console.error('Failed to reload webview', error);
                        }
                    }
                };
                setTimeout(refresh, RETRY_TIMEOUT);
                setTimeout(refresh, 500);
            }
        }, [projectsManager.runner?.state]);

        useEffect(() => {
            if (
                settings.dimension.width !== webviewSize.width ||
                settings.dimension.height !== webviewSize.height ||
                settings.position.x !== webviewPosition.x ||
                settings.position.y !== webviewPosition.y ||
                settings.url !== webviewSrc
            ) {
                debouncedSaveFrame(settings.id, {
                    url: webviewSrc,
                    dimension: webviewSize,
                    position: webviewPosition,
                });
            }
        }, [webviewSize, webviewSrc, webviewPosition]);

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

        useEffect(() => {
            const webview = webviewRef.current as Electron.WebviewTag | null;

            setWebviewSize(settings.dimension);
            setWebviewPosition(settings.position);
            setWebviewSrc(settings.url);
            setAspectRatioLocked(settings.aspectRatioLocked || DefaultSettings.ASPECT_RATIO_LOCKED);
            if (webview) {
                webview.id = settings.id;
                setupFrame();
                domState = editorEngine.webviews.getState(settings.id);
            }
        }, [settings.id]);

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

        function deregisterWebview() {
            const webview = webviewRef.current as Electron.WebviewTag | null;
            if (!webview) {
                return;
            }
            editorEngine.webviews.deregister(webview);
            messageBridge.deregister(webview);
            webview.removeEventListener('did-navigate', handleUrlChange);
        }

        function setBrowserEventListeners(webview: Electron.WebviewTag) {
            webview.addEventListener('did-navigate', handleUrlChange);
            webview.addEventListener('did-navigate-in-page', handleUrlChange);
            webview.addEventListener('dom-ready', handleDomReady);
            webview.addEventListener('did-fail-load', handleDomFailed);
            webview.addEventListener('focus', handleWebviewFocus);
            webview.addEventListener('blur', handleWebviewBlur);
            webview.addEventListener('console-message', handleConsoleMessage);
        }

        async function getDarkMode(webview: Electron.WebviewTag) {
            const darkmode = (await webview.executeJavaScript(`window.api?.getTheme()`)) || 'light';
            setDarkmode(darkmode === 'dark');
        }

        function handleDomFailed() {
            setDomFailed(true);
            const webview = webviewRef.current as Electron.WebviewTag | null;
            if (!webview) {
                return;
            }
            editorEngine.webviews.setState(webview, WebviewState.RUNNING_NO_DOM);

            setTimeout(() => {
                if (webview) {
                    try {
                        webview.reload();
                    } catch (error) {
                        console.error('Failed to reload webview', error);
                    }
                }
            }, RETRY_TIMEOUT);
        }

        function handleWebviewFocus() {
            editorEngine.webviews.deselectAll();
            editorEngine.webviews.select(webviewRef.current as Electron.WebviewTag);
        }

        function handleWebviewBlur() {}

        function handleConsoleMessage(event: Electron.ConsoleMessageEvent) {
            if (event.sourceId === 'chrome-error://chromewebdata/') {
                // This is a chrome error from renderer, we don't want to show it
                return;
            }
            if (event.level === 3) {
                editorEngine.errors.addError(settings.id, event);
            }
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

        function getSelectedOutlineColor() {
            if (editorEngine.mode === EditorMode.INTERACT) {
                return 'outline-blue-400';
            }
            if (domState === WebviewState.DOM_ONLOOK_ENABLED) {
                return 'outline-teal-400';
            }
            if (domState === WebviewState.DOM_NO_ONLOOK) {
                return 'outline-amber-400';
            }
            if (domState === WebviewState.NOT_RUNNING && editorEngine.mode === EditorMode.DESIGN) {
                return 'outline-foreground-secondary';
            }
            return 'outline-transparent';
        }

        function renderNotRunning() {
            return (
                <ShineBorder
                    className="w-full absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-gray-800/40 via-gray-500/40 to-gray-400/40 border-gray-500 border-[0.5px] space-y-6 rounded-xl"
                    color={['#A07CFE', '#FE8FB5', '#FFBE7B']}
                >
                    {projectsManager.runner?.state === RunState.RUNNING ? (
                        <>
                            <p className="text-active text-title1 text-center">
                                {'Waiting for the App to start...'}
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-active text-title1 text-center">
                                {'Press '}
                                <span className="text-teal-600 dark:text-teal-300">Play</span>
                                {' to start designing your App'}
                            </p>
                            <Button
                                className="text-4xl w-96 h-32"
                                onClick={() => {
                                    projectsManager.runner?.start();
                                }}
                            >
                                Play
                            </Button>
                        </>
                    )}
                </ShineBorder>
            );
        }

        return (
            <div
                className="flex flex-col"
                style={{ transform: `translate(${webviewPosition.x}px, ${webviewPosition.y}px)` }}
            >
                <BrowserControls
                    webviewRef={domReady ? webviewRef : null}
                    webviewSrc={webviewSrc}
                    setWebviewSrc={setWebviewSrc}
                    selected={selected}
                    hovered={hovered}
                    setHovered={setHovered}
                    setDarkmode={setDarkmode}
                    settings={settings}
                    startMove={startMove}
                    deregisterWebview={deregisterWebview}
                    domState={domState}
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
                        aspectRatioLocked={aspectRatioLocked || DefaultSettings.ASPECT_RATIO_LOCKED}
                        webviewId={settings.id}
                    />
                    <webview
                        id={settings.id}
                        ref={webviewRef}
                        className={cn(
                            'w-[96rem] h-[60rem] backdrop-blur-sm transition outline outline-4',
                            shouldShowDomFailed ? 'bg-transparent' : 'bg-white',
                            selected ? getSelectedOutlineColor() : 'outline-transparent',
                        )}
                        src={settings.url}
                        preload={`file://${window.env.WEBVIEW_PRELOAD_PATH}`}
                        allowpopups={'true' as any}
                        style={{
                            width: clampedDimensions.width,
                            height: clampedDimensions.height,
                            minWidth: DefaultSettings.MIN_DIMENSIONS.width,
                            minHeight: DefaultSettings.MIN_DIMENSIONS.height,
                        }}
                    ></webview>
                    <GestureScreen
                        isResizing={isResizing}
                        webviewRef={webviewRef}
                        setHovered={setHovered}
                    />
                    {domFailed && shouldShowDomFailed && renderNotRunning()}
                </div>
            </div>
        );
    },
);

export default Frame;
