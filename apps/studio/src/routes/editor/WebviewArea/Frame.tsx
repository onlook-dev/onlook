import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { WebviewState } from '@/lib/editor/engine/webview';
import type { WebviewMessageBridge } from '@/lib/editor/messageBridge';
import { EditorMode } from '@/lib/models';
import type { SizePreset } from '@/lib/sizePresets';
import { DefaultSettings } from '@onlook/models/constants';
import type { FrameSettings } from '@onlook/models/projects';
import { RunState } from '@onlook/models/run';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { ShineBorder } from '@onlook/ui/shine-border';
import { cn } from '@onlook/ui/utils';
import { motion } from 'framer-motion';
import debounce from 'lodash/debounce';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
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
        const { t } = useTranslation();
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

        const handleUrlChange = useCallback(
            (e: any) => {
                setWebviewSrc(e.url);

                editorEngine.pages.handleWebviewUrlChange(settings.id);
            },
            [editorEngine.pages, settings.id],
        );

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

            if (state === WebviewState.DOM_ONLOOK_ENABLED) {
                setTimeout(() => {
                    selectFirstElement(webview);
                }, 1000);
            }

            setTimeout(() => {
                getDarkMode(webview);
            }, 100);
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
            if (editorEngine.mode === EditorMode.PREVIEW) {
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
                <>
                    {projectsManager.runner?.state === RunState.RUNNING ? (
                        <ShineBorder
                            className="w-full absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-gray-800/40 via-gray-500/40 to-gray-400/40 border-gray-500 border-[0.5px] space-y-10 rounded-xl"
                            color={[
                                'var(--color-teal-300)',
                                'var(--color-blue-400)',
                                'var(--color-purple-200)',
                            ]}
                            autoShine={true}
                        >
                            <motion.p
                                className="text-active text-title1 text-center text-balance pb-24"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                {t('editor.frame.waitingForApp')}
                            </motion.p>
                        </ShineBorder>
                    ) : (
                        <div className="w-full absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-gray-800/40 via-gray-500/40 to-gray-400/40 border-gray-500 border-[0.5px] space-y-10 rounded-xl">
                            <p className="text-active text-title1 text-center text-balance">
                                {t('editor.frame.startDesigning.prefix')}
                                <span className="text-teal-600 dark:text-teal-300">
                                    {t('editor.frame.startDesigning.action')}
                                </span>
                                {t('editor.frame.startDesigning.suffix')}
                            </p>
                            <Button
                                className={cn(
                                    'h-14 overflow-hidden',
                                    'text-teal-700 dark:text-teal-100 relative border-teal-700 dark:border-teal-400 hover:border-teal-500 dark:hover:border-teal-200 hover:shadow-xl shadow-2xl shadow-teal-700/50 dark:shadow-teal-400/50 hover:shadow-teal-500/50 dark:hover:shadow-teal-200/50 transition-all duration-300',
                                    'before:absolute before:inset-0 before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.teal.200/80)_0%,theme(colors.teal.300/80)_100%)] dark:before:bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,theme(colors.teal.800/80)_0%,theme(colors.teal.500/80)_100%)]',
                                    'after:absolute after:inset-0 after:bg-[radial-gradient(169.40%_89.55%_at_90%_10%,theme(colors.teal.300/50)_0%,theme(colors.teal.200/50)_100%)] dark:after:bg-[radial-gradient(169.40%_89.55%_at_90%_10%,theme(colors.teal.500/50)_0%,theme(colors.teal.400/50)_100%)]',
                                    'after:opacity-0 hover:after:opacity-100',
                                    'before:transition-all after:transition-all before:duration-300 after:duration-300',
                                    'before:z-0 after:z-0',
                                )}
                                onClick={() => {
                                    projectsManager.runner?.start();
                                }}
                            >
                                <span className="relative z-10 flex items-center gap-x-1.5 px-3 py-2.5">
                                    <Icons.Play className="w-8 h-8" />
                                    <span className="text-title3">
                                        {t('editor.frame.playButton')}
                                    </span>
                                </span>
                            </Button>
                        </div>
                    )}
                </>
            );
        }

        async function selectFirstElement(webview: Electron.WebviewTag) {
            const domEl = await webview.executeJavaScript(`window.api?.getFirstOnlookElement()`);
            if (domEl) {
                editorEngine.elements.click([domEl], webview);
            }
        }

        return (
            <div
                className="flex flex-col fixed"
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
                    domState={domState}
                    webviewSize={webviewSize}
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
